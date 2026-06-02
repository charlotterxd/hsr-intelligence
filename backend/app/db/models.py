from sqlalchemy import Column, String, Integer, Boolean, Float
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class CharacterInfo(Base):
    __tablename__ = "character_info"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=True)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    rarity = Column(Integer)
    path = Column(String(100))
    element = Column(String(100))
    role = Column(String(100))
    signature = Column(String(255))
    availability = Column(String(100))
    is_giveaway = Column(Boolean, default=False)
    giveaway_choose_group = Column(String(255))
    free_later = Column(String(255))
    released_patch = Column(String(50))


class PlayerRecord(Base):
    __tablename__ = "player_records_pf"

    team_id = Column(Integer, primary_key=True)
    filename = Column(String(255), primary_key=True)
    name = Column(String(255), primary_key=True)
    uid = Column(String(255), nullable=False)
    node = Column(Integer, nullable=False)
    round_num = Column(Integer, nullable=False)
    version = Column(Float)
    weapon = Column(String(255))
    cons = Column(Integer, default=0)


class PlayerRecordAS(Base):
    __tablename__ = "player_records_as"

    team_id = Column(Integer, primary_key=True)
    filename = Column(String(255), primary_key=True)
    name = Column(String(255), primary_key=True)
    uid = Column(String(255), nullable=False)
    node = Column(Integer, nullable=False)
    round_num = Column(Integer, nullable=False)
    version = Column(Float)
    weapon = Column(String(255))
    cons = Column(Integer, default=0)


class PlayerRecordMOC(Base):
    __tablename__ = "player_records_moc"

    team_id = Column(Integer, primary_key=True)
    filename = Column(String(255), primary_key=True)
    name = Column(String(255), primary_key=True)
    uid = Column(String(255), nullable=False)
    node = Column(Integer, nullable=False)
    round_num = Column(Integer, nullable=False)
    version = Column(Float)
    weapon = Column(String(255))
    cons = Column(Integer, default=0)


class PlayerRecordAA(Base):
    __tablename__ = "player_records_anomaly"

    filename = Column(String(255), primary_key=True)
    uid = Column(String(255), primary_key=True)
    team_id = Column(Integer, primary_key=True)
    floor = Column(Integer, primary_key=True)
    name = Column(String(255), primary_key=True)
    round_num = Column(Integer, nullable=False)
    version = Column(Float)
    weapon = Column(String(255))
    cons = Column(Integer, default=0)
