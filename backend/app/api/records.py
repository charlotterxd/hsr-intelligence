from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db import crud
from app.schemas import TrendRequest, TrendResponse, CharacterInfoResponse, CostAnalysisRequest, CostBinResult, SurvivalAnalysisRequest, SurvivalBinResult, AARequest, AAAvgResult, AADistributionResult, AAHardModeStatsRequest, AAHardModeStatsResult, AATopDPSCharacter
import time
import logging
from concurrent.futures import ThreadPoolExecutor
import asyncio

logger = logging.getLogger(__name__)
executor = ThreadPoolExecutor(max_workers=4)

router = APIRouter()


@router.post("/trends", response_model=list[TrendResponse])
async def get_score_trends(
    request: TrendRequest,
    db: Session = Depends(get_db)
):
    """
    Get score trends filtered by characters.

    All selected characters must appear in the same node/floor for that node/floor to match.
    Supports Pure Fiction, Apocalyptic Shadow, Memory of Chaos, and Anomaly Arbitration via gameMode parameter.
    """
    start_time = time.time()

    if not request.characters:
        raise HTTPException(status_code=400, detail="At least one character must be selected")

    if request.aggregation not in ["mean", "median"]:
        raise HTTPException(status_code=400, detail="Aggregation must be 'mean' or 'median'")

    if request.sustain_filter not in ["Both", "Yes", "No"]:
        raise HTTPException(status_code=400, detail="Sustain filter must be 'Both', 'Yes', or 'No'")

    if request.gameMode not in ["pureFiction", "apocalypticShadow", "memoryOfChaos", "anomalyArbitration"]:
        raise HTTPException(status_code=400, detail="gameMode must be 'pureFiction', 'apocalypticShadow', 'memoryOfChaos', or 'anomalyArbitration'")

    character_names = [c.name for c in request.characters]
    eidolons = [c.eidolon for c in request.characters]
    signature_lc_modes = [c.signature_lc_mode for c in request.characters]

    # Run blocking DB operation in thread pool to avoid blocking async event loop
    loop = asyncio.get_event_loop()

    if request.gameMode == "apocalypticShadow":
        from app.db import crud_as
        crud_func = crud_as.get_score_trends_as
    elif request.gameMode == "memoryOfChaos":
        from app.db import crud_moc
        crud_func = crud_moc.get_score_trends_moc
    elif request.gameMode == "anomalyArbitration":
        from app.db import crud_aa
        crud_func = crud_aa.get_score_trends_aa
    else:
        crud_func = crud.get_score_trends

    # For AA, pass floor_type parameter
    kwargs = {
        'character_names': character_names,
        'eidolons': eidolons,
        'signature_lc_modes': signature_lc_modes,
        'sustain_filter': request.sustain_filter,
        'aggregation': request.aggregation,
        'exclude_characters': request.exclude_characters or []
    }
    if request.gameMode == "anomalyArbitration" and hasattr(request, 'floor_type'):
        kwargs['floor_type'] = request.floor_type

    trends = await loop.run_in_executor(
        executor,
        lambda: crud_func(db, **kwargs)
    )

    elapsed = time.time() - start_time
    print(f"[TIMING] Trends query ({request.gameMode}): chars={character_names}, sustain={request.sustain_filter}, agg={request.aggregation}, time={elapsed:.2f}s, results={len(trends)}")

    return trends


@router.post("/cost-analysis", response_model=list[CostBinResult])
async def get_cost_analysis(
    request: CostAnalysisRequest,
    db: Session = Depends(get_db)
):
    """
    Get cost analysis for a selected DPS character across patch range.
    Returns score distribution by cost bins (0-10, 11-15, 16+ limited 5-star pulls).
    Supports Pure Fiction, Apocalyptic Shadow, and Memory of Chaos via gameMode parameter.
    """
    start_time = time.time()

    if request.aggregation not in ["mean", "median"]:
        raise HTTPException(status_code=400, detail="Aggregation must be 'mean' or 'median'")

    if request.gameMode not in ["pureFiction", "apocalypticShadow", "memoryOfChaos", "anomalyArbitration"]:
        raise HTTPException(status_code=400, detail="gameMode must be 'pureFiction', 'apocalypticShadow', 'memoryOfChaos', or 'anomalyArbitration'")

    # Run blocking DB operation in thread pool
    loop = asyncio.get_event_loop()

    if request.gameMode == "apocalypticShadow":
        from app.db import crud_as
        crud_func = crud_as.get_cost_analysis_as
    elif request.gameMode == "memoryOfChaos":
        from app.db import crud_moc
        crud_func = crud_moc.get_cost_analysis_moc
    elif request.gameMode == "anomalyArbitration":
        from app.db import crud_aa
        crud_func = crud_aa.get_cost_analysis_aa
    else:
        crud_func = crud.get_cost_analysis

    # Build kwargs based on gameMode
    kwargs = {
        'character_name': request.character,
        'signature_lc_mode': request.signature_lc_mode,
        'sustain_filter': request.sustain_filter,
        'aggregation': request.aggregation,
        'include_standard_eidolons': request.include_standard_eidolons
    }

    if request.gameMode == "anomalyArbitration":
        kwargs['floor_type'] = request.floor_type
        kwargs['patch_start'] = request.patch_start
        kwargs['patch_end'] = request.patch_end
    else:
        kwargs['patch_start'] = request.patch_start
        kwargs['patch_end'] = request.patch_end

    results = await loop.run_in_executor(
        executor,
        lambda: crud_func(db, **kwargs)
    )

    elapsed = time.time() - start_time
    print(f"[TIMING] Cost analysis ({request.gameMode}): char={request.character}, patches={request.patch_start}..{request.patch_end}, agg={request.aggregation}, time={elapsed:.2f}s, results={len(results)}")

    return results


@router.get("/characters", response_model=list[CharacterInfoResponse])
async def list_characters(db: Session = Depends(get_db)):
    """Get all available characters from character_info"""
    characters = crud.get_all_characters(db)
    return characters


@router.get("/available-patches")
async def get_available_patches(character: str, gameMode: str = "pureFiction", db: Session = Depends(get_db)):
    """Get all patches where a character appears in a specific game mode"""
    if gameMode == "apocalypticShadow":
        from app.db import crud_as
        patches = crud_as.get_available_patches_as(db, character)
    elif gameMode == "memoryOfChaos":
        from app.db import crud_moc
        patches = crud_moc.get_available_patches_moc(db, character)
    elif gameMode == "anomalyArbitration":
        from app.db import crud_aa
        patches = crud_aa.get_available_patches_aa(db, character)
    else:
        patches = crud.get_available_patches(db, character)
    return {"patches": patches}


@router.post("/survival-analysis", response_model=list[SurvivalBinResult])
async def get_survival_analysis(
    request: SurvivalAnalysisRequest,
    db: Session = Depends(get_db)
):
    """
    Get survival analysis for a selected character.
    Returns average score vs patches since release.
    Supports Pure Fiction, Apocalyptic Shadow, and Memory of Chaos via gameMode parameter.
    """
    start_time = time.time()

    if request.aggregation not in ["mean", "median"]:
        raise HTTPException(status_code=400, detail="Aggregation must be 'mean' or 'median'")

    if request.sustain_filter not in ["Both", "Yes", "No"]:
        raise HTTPException(status_code=400, detail="Sustain filter must be 'Both', 'Yes', or 'No'")

    if request.eidolon < -1 or request.eidolon > 6:
        raise HTTPException(status_code=400, detail="Eidolon must be -1 (all) or 0-6")

    if request.gameMode not in ["pureFiction", "apocalypticShadow", "memoryOfChaos"]:
        raise HTTPException(status_code=400, detail="gameMode must be 'pureFiction', 'apocalypticShadow', or 'memoryOfChaos'")

    # Run blocking DB operation in thread pool
    loop = asyncio.get_event_loop()

    if request.gameMode == "apocalypticShadow":
        from app.db import crud_as
        crud_func = crud_as.get_survival_analysis_as
    elif request.gameMode == "memoryOfChaos":
        from app.db import crud_moc
        crud_func = crud_moc.get_survival_analysis_moc
    else:
        crud_func = crud.get_survival_analysis

    results = await loop.run_in_executor(
        executor,
        lambda: crud_func(
            db,
            character_name=request.character,
            eidolon=request.eidolon,
            signature_lc_mode=request.signature_lc_mode,
            sustain_filter=request.sustain_filter,
            aggregation=request.aggregation
        )
    )

    elapsed = time.time() - start_time
    print(f"[TIMING] Survival analysis ({request.gameMode}): char={request.character}, eidolon={request.eidolon}, agg={request.aggregation}, time={elapsed:.2f}s, results={len(results)}")

    return results


@router.get("/all-patches")
async def get_all_patches(db: Session = Depends(get_db)):
    """Get all distinct patches from player_records, sorted numerically"""
    patches = crud.get_all_patches(db)
    return {"patches": patches}


@router.post("/aa/avg-cycles", response_model=list[AAAvgResult])
async def get_aa_avg_cycles(
    request: AARequest,
    db: Session = Depends(get_db)
):
    """
    Get average cycles used per version for Anomaly Arbitration.
    floor_type: "knights" (floors 1-3) or "king_normal" (floor 4)
    """
    start_time = time.time()

    if request.floor_type not in ["knights", "king_normal"]:
        raise HTTPException(status_code=400, detail="floor_type must be 'knights' or 'king_normal'")

    from app.db import crud_aa
    loop = asyncio.get_event_loop()

    results = await loop.run_in_executor(
        executor,
        lambda: crud_aa.get_avg_cycles_aa(
            db,
            floor_type=request.floor_type,
            character_names=request.character_names or None,
            eidolons=request.eidolons or None,
            signature_lc_modes=request.signature_lc_modes or None,
            sustain_filter=request.sustain_filter
        )
    )

    elapsed = time.time() - start_time
    print(f"[TIMING] AA avg cycles ({request.floor_type}): time={elapsed:.2f}s, results={len(results)}")

    return results


@router.post("/aa/distribution", response_model=list[AADistributionResult])
async def get_aa_distribution(
    request: AARequest,
    db: Session = Depends(get_db)
):
    """
    Get cycle usage distribution (binned: 0, 1-2, 3-4, 5-6) per version for Anomaly Arbitration.
    floor_type: "knights" (floors 1-3) or "king_normal" (floor 4)
    """
    start_time = time.time()

    if request.floor_type not in ["knights", "king_normal"]:
        raise HTTPException(status_code=400, detail="floor_type must be 'knights' or 'king_normal'")

    from app.db import crud_aa
    loop = asyncio.get_event_loop()

    results = await loop.run_in_executor(
        executor,
        lambda: crud_aa.get_distribution_aa(
            db,
            floor_type=request.floor_type,
            character_names=request.character_names or None,
            eidolons=request.eidolons or None,
            signature_lc_modes=request.signature_lc_modes or None,
            sustain_filter=request.sustain_filter
        )
    )

    elapsed = time.time() - start_time
    print(f"[TIMING] AA distribution ({request.floor_type}): time={elapsed:.2f}s, results={len(results)}")

    return results


@router.get("/aa/patches")
async def get_aa_patches(db: Session = Depends(get_db)):
    """Get all patches where AA data exists, sorted"""
    from app.db.models import PlayerRecordAA
    patches = db.query(PlayerRecordAA.version).distinct().order_by(PlayerRecordAA.version).all()
    return {"patches": [str(p[0]) for p in patches]}


@router.get("/aa/passing-rate-trend")
async def get_aa_passing_rate_trend(db: Session = Depends(get_db)):
    """
    Get hard mode passing rate trend across all patches.
    Returns passing rate for each patch.
    """
    start_time = time.time()

    from app.db import crud_aa
    loop = asyncio.get_event_loop()

    result = await loop.run_in_executor(
        executor,
        lambda: crud_aa.get_passing_rate_trend(db)
    )

    elapsed = time.time() - start_time
    print(f"[TIMING] AA passing rate trend: time={elapsed:.2f}s, results={len(result)}")

    return result


@router.post("/aa/hard-mode-stats", response_model=AAHardModeStatsResult)
async def get_aa_hard_mode_stats(
    request: AAHardModeStatsRequest,
    db: Session = Depends(get_db)
):
    """
    Get hard mode statistics: passing rate and top 5 DPS characters.
    Filters by single patch.
    """
    start_time = time.time()

    from app.db import crud_aa
    loop = asyncio.get_event_loop()

    result = await loop.run_in_executor(
        executor,
        lambda: crud_aa.get_hard_mode_stats(
            db,
            patch=request.patch
        )
    )

    elapsed = time.time() - start_time
    print(f"[TIMING] AA hard mode stats (patch={request.patch}): time={elapsed:.2f}s")

    return result


@router.get("/aa/peasant-mode-stats")
async def get_aa_peasant_mode_stats(db: Session = Depends(get_db)):
    """
    Get peasant mode statistics as time series: normal players (no floor=5 entries).
    Returns time series data for: knights completion, king normal completion, cycle distribution, average cost.
    """
    start_time = time.time()

    from app.db import crud_aa
    loop = asyncio.get_event_loop()

    result = await loop.run_in_executor(
        executor,
        lambda: crud_aa.get_peasant_mode_stats(db)
    )

    elapsed = time.time() - start_time
    print(f"[TIMING] AA peasant mode stats (time series): time={elapsed:.2f}s")

    return result
