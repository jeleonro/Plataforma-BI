import os
from sqlalchemy import create_engine

# En local usa las variables del .env
# En Railway usa las variables de entorno del proyecto

USER     = os.getenv("DB_USER",     "root")
PASSWORD = os.getenv("DB_PASSWORD", "250306")
HOST     = os.getenv("DB_HOST",     "localhost")
PORT     = os.getenv("DB_PORT",     "3306")
DB       = os.getenv("DB_NAME",     "bi_empleabilidad")

DATABASE_URL = (
    f"mysql+pymysql://{USER}:{PASSWORD}"
    f"@{HOST}:{PORT}/{DB}"
)

engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,      # reconecta si la conexión se cae
    pool_recycle=280         # evita timeout de MySQL en Railway
)
