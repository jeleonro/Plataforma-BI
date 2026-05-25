def validar_dataframe(df):

    errores = []

    columnas_obligatorias = [
        "NOMBRE_ENTIDAD",
        "TIPO_GESTION",
        "LICENCIADO",
        "SEXO",
        "EDAD",
        "NOTA_PROMEDIO",
        "NOMBRE_PROGRAMA",
        "FECHA_EGRESO",
        "ANIO"
    ]

    for c in columnas_obligatorias:
        if c not in df.columns:
            errores.append(
                f"Falta columna obligatoria: {c}"
            )

    if errores:
        return errores

    # NOTA_PROMEDIO entre 0 y 20
    import pandas as pd
    promedio = pd.to_numeric(
        df["NOTA_PROMEDIO"],
        errors="coerce"
    )
    invalidos_promedio = promedio[
        (promedio < 0) | (promedio > 20)
    ].count()

    if invalidos_promedio > 0:
        errores.append(
            f"{invalidos_promedio} filas con NOTA_PROMEDIO fuera de rango (0-20)"
        )

    # EDAD positiva
    edad = pd.to_numeric(
        df["EDAD"],
        errors="coerce"
    )
    invalidos_edad = edad[edad < 0].count()

    if invalidos_edad > 0:
        errores.append(
            f"{invalidos_edad} filas con EDAD negativa"
        )

    # SEXO solo M / F
    sexos_validos = {"M", "F", "MASCULINO", "FEMENINO"}
    sexos_en_df = set(
        df["SEXO"].dropna().str.upper().str.strip().unique()
    )
    sexos_invalidos = sexos_en_df - sexos_validos

    if sexos_invalidos:
        errores.append(
            f"Valores de SEXO no reconocidos: {sexos_invalidos}"
        )

    # Nulos en columnas clave
    nulos = df["NOTA_PROMEDIO"].isna().sum()
    if nulos > 0:
        errores.append(
            f"{nulos} filas sin NOTA_PROMEDIO"
        )

    return errores
