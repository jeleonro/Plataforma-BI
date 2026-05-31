from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

from validation import validar_dataframe
from database import engine
from etl import ejecutar_etl
from MachineLearning.ia import ejecutar_ia
from semantic import generar_kpis
from dashboard import dashboard_data

app = FastAPI()

# ==========================
# CORS — permite llamadas desde el frontend
# ==========================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================
# UPLOAD CSV/XLSX
# ==========================

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...)
):

    try:

        if file.filename.endswith(".csv"):
            df = pd.read_csv(
                file.file,
                sep="|",
                encoding="latin1"
            )

        elif file.filename.endswith(".xlsx"):
            df = pd.read_excel(file.file)

        else:
            return {
                "success": False,
                "message": "Formato inválido. Solo .csv o .xlsx"
            }

        # validar ANTES de guardar
        errores = validar_dataframe(df)

        preview = (
            df.head(10)
            .fillna("")
            .replace({float("inf"): "", float("-inf"): ""})
        )

        # solo guardar en staging si no hay errores
        saved = False

        if len(errores) == 0:
            df.to_sql(
                "staging_egresados",
                con=engine,
                if_exists="replace",
                index=False
            )
            saved = True

        return {
            "success": True,
            "rows": len(df),
            "columns": list(df.columns),
            "preview": preview.to_dict(orient="records"),
            "errores": errores,
            "saved": saved
        }

    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }


@app.post("/validate")
async def validate_data():

    try:

        df = pd.read_sql(
            "SELECT * FROM staging_egresados",
            engine
        )

        errores = validar_dataframe(df)

        return {
            "success": True,
            "rows": len(df),
            "errores": errores,
            "valid": len(errores) == 0
        }

    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }


@app.post("/etl")
async def etl():

    try:
        resultado = ejecutar_etl()
        return {
            "success": True,
            "message": "ETL completado",
            "data": resultado
        }

    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }


@app.post("/ia")
async def ia():

    try:
        resultado = ejecutar_ia()
        return {
            "success": True,
            "data": resultado
        }

    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }


@app.post("/semantic")
async def semantic():

    try:
        data = generar_kpis()
        return {
            "success": True,
            "data": data
        }

    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }


@app.post("/dashboard")
async def dashboard():

    try:
        data = dashboard_data()
        return {
            "success": True,
            "data": data
        }

    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }
