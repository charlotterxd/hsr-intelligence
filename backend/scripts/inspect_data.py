#!/usr/bin/env python3
"""Inspect sample data files for schema and structure."""

import pandas as pd
import sys
from pathlib import Path

# Navigate to project root
project_root = Path(__file__).parent.parent.parent

def inspect_char_csv():
    """Inspect character info CSV"""
    char_path = project_root / '.data' / 'char.csv'
    df = pd.read_csv(char_path)

    print("\n" + "="*80)
    print("CHARACTER INFO DATA STRUCTURE (.data/char.csv)")
    print("="*80)
    print(f"\nShape: {df.shape[0]} rows × {df.shape[1]} columns")
    print(f"\nColumns: {list(df.columns)}")
    print(f"\nData types:")
    for col, dtype in df.dtypes.items():
        print(f"  {col}: {dtype}")
    print(f"\nFirst 5 rows:")
    print(df.head(5).to_string(index=False))
    print(f"\nNull values:")
    print(df.isnull().sum())
    print(f"\nSample values:")
    for col in df.columns[:5]:
        print(f"  {col}: {df[col].unique()[:3]}")

def inspect_pf_csv():
    """Inspect player records CSV"""
    pf_path = project_root / '.data' / 'pf.csv'
    df = pd.read_csv(pf_path)

    print("\n" + "="*80)
    print("PLAYER RECORDS DATA STRUCTURE (.data/pf.csv)")
    print("="*80)
    print(f"\nShape: {df.shape[0]} rows × {df.shape[1]} columns")
    print(f"\nColumns: {list(df.columns)}")
    print(f"\nData types:")
    for col, dtype in df.dtypes.items():
        print(f"  {col}: {dtype}")
    print(f"\nFirst 5 rows:")
    print(df.head(5).to_string(index=False))
    print(f"\nNull values:")
    print(df.isnull().sum())
    print(f"\nKey statistics:")
    if 'version' in df.columns:
        print(f"  Unique versions: {df['version'].nunique()}")
        print(f"  Versions: {sorted(df['version'].unique())[:10]}")
    if 'node' in df.columns:
        print(f"  Unique nodes: {df['node'].unique()}")
    if 'cons' in df.columns:
        print(f"  Eidolon range: {df['cons'].min()} - {df['cons'].max()}")
    if 'round_num' in df.columns:
        print(f"  Score range: {df['round_num'].min()} - {df['round_num'].max()}")

if __name__ == '__main__':
    try:
        inspect_char_csv()
        inspect_pf_csv()
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
