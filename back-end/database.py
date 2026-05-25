from sqlalchemy import create_engine

USER = "root"
PASSWORD = "250306"
HOST = "localhost"
PORT = "3306"
DB = "bi_empleabilidad"

DATABASE_URL = (
    f"mysql+pymysql://{USER}:{PASSWORD}"
    f"@{HOST}:{PORT}/{DB}"
)

engine = create_engine(
    DATABASE_URL,
    echo=True
)