from pydantic import BaseModel
from typing import List, Optional


class CharacterFilter(BaseModel):
    name: str  # character name (e.g., "Ruan Mei", "Herta")
    eidolon: int = 0
    signature_lc_mode: str = "both"  # "both", "signature", "no-signature"


class TrendRequest(BaseModel):
    characters: List[CharacterFilter]
    exclude_characters: List[str] = []  # character names to exclude
    sustain_filter: str = "Both"  # "Both", "Yes", "No"
    aggregation: str = "mean"  # "mean" or "median"
    gameMode: str = "pureFiction"  # "pureFiction" or "apocalypticShadow"
    floor_type: Optional[str] = None  # "knights" or "king_normal" for AA


class TrendResponse(BaseModel):
    version: str
    score: float
    count: int


class CharacterInfoResponse(BaseModel):
    id: int
    name: str
    slug: str
    rarity: Optional[int]
    path: Optional[str]
    element: Optional[str]
    role: Optional[str]
    signature: Optional[str]
    availability: Optional[str]
    is_giveaway: bool
    giveaway_choose_group: Optional[str] = None
    free_later: Optional[str] = None
    released_patch: Optional[str] = None


class CostAnalysisRequest(BaseModel):
    character: str
    patch_start: str
    patch_end: str
    signature_lc_mode: str = "both"
    sustain_filter: str = "Both"
    aggregation: str = "mean"
    include_standard_eidolons: bool = False  # Count standard/free-later char eidolons in cost
    gameMode: str = "pureFiction"  # "pureFiction", "apocalypticShadow", "memoryOfChaos", or "anomalyArbitration"
    floor_type: str = "knights"  # For AA: "knights" or "king_normal"


class CostBinResult(BaseModel):
    bin: str
    score: float
    count: int


class SurvivalAnalysisRequest(BaseModel):
    character: str
    eidolon: int = -1
    signature_lc_mode: str = "both"
    sustain_filter: str = "Both"
    aggregation: str = "mean"
    gameMode: str = "pureFiction"  # "pureFiction" or "apocalypticShadow"


class SurvivalBinResult(BaseModel):
    patches_since: int
    patch: str
    score: float
    count: int


class UploadResponse(BaseModel):
    inserted: int
    updated: int
    message: str


class AARequest(BaseModel):
    floor_type: str = "knights"  # "knights" (floors 1-3) or "king_normal" (floor 4)
    character_names: List[str] = []  # optional character names to filter by
    eidolons: List[int] = []  # optional eidolon levels (one per character)
    signature_lc_modes: List[str] = []  # optional signature LC modes (one per character)
    sustain_filter: str = "Both"  # "Both", "Yes", or "No"


class AAAvgResult(BaseModel):
    version: str
    avg_cycles: float
    count: int


class AADistributionResult(BaseModel):
    version: str
    bin_0: float      # % cleared in 0 cycles
    bin_1_2: float    # % in 1-2 cycles
    bin_3_4: float    # % in 3-4 cycles
    bin_5_6: float    # % in 5-6 cycles


class AAHardModeStatsRequest(BaseModel):
    patch: str


class AAHardModePassingRateResult(BaseModel):
    version: str
    passing_rate: float  # percentage of players who cleared hard mode
    count: int


class AATopDPSCharacter(BaseModel):
    character: str
    eidolon_group: str  # "0-1", "1", "2-5", "6"
    avg_cost: float
    median_cost: float
    sustain_usage_rate: float
    percentage: float


class AAHardModeStatsResult(BaseModel):
    passing_rate: float
    top_dps: List[AATopDPSCharacter]
