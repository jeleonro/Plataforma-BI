const panel = document.getElementById("panel");

// instancias de Chart.js activas (para destruirlas al cambiar de panel)
let chartsActivos = []; 

function mostrarModulo(modulo, elemento) {

    document
        .querySelectorAll(".module")
        .forEach((m) => m.classList.remove("active"));

    elemento.classList.add("active");

    // destruir charts anteriores para evitar conflictos
    chartsActivos.forEach(c => c.destroy());
    chartsActivos = [];

    const vistas = {

        fuente: `
            <h2>Fase 1 · Fuente de Datos</h2>

            <p class="panel-desc">
            Carga masiva de datasets (.CSV / .XLSX)
            para iniciar el pipeline BI.
            </p>

            <div class="drop-zone"
                onclick="document.getElementById('fileInput').click()">

                <i class="fa-solid fa-cloud-arrow-up"></i>

                <h3>Arrastra tu archivo aquí</h3>

                <p>o haz click para seleccionarlo</p>

                <input
                    type="file"
                    id="fileInput"
                    accept=".csv,.xlsx"
                    hidden
                    onchange="mostrarNombreArchivo()"
                >

            </div>

            <div id="fileInfo"></div>

            <div class="upload-actions">
                <button class="btn-upload" onclick="subirArchivo()">
                    Procesar archivo
                </button>
            </div>

            <div id="resultadoUpload"></div>
        `,

        staging: `
            <h2>Fase 1.5 · Staging & Validación</h2>

            <p class="panel-desc">
            Verificación automática del dataset antes del ETL.
            Comprueba columnas, rangos, nulos y valores inválidos.
            </p>

            <button class="btn-upload" onclick="ejecutarValidacion()">
                Validar Dataset
            </button>

            <div id="resultadoValidacion"></div>
        `,

        etl: `
            <h2>Fase 2 · ETL</h2>

            <p class="panel-desc">
            Extracción, transformación y carga
            hacia el Data Warehouse.
            </p>

            <button class="btn-upload" onclick="ejecutarETL()">
                Ejecutar ETL
            </button>

            <div id="resultadoETL"></div>
        `,

        dw: `
            <h2>Fase 3 · Data Warehouse</h2>

            <p class="panel-desc">
            Construcción y visualización del modelo estrella.
            </p>

            <button class="btn-upload" onclick="generarDW()">
                Generar Modelo Estrella
            </button>

            <div id="resultadoDW"></div>
        `,

        ia: `
            <h2>Fase 4 · IA Predictiva</h2>

            <p class="panel-desc">
            Predicción de rendimiento académico mediante ML
            (RandomForest con múltiples variables).
            </p>

            <button class="btn-upload" onclick="ejecutarIA()">
                Entrenar IA
            </button>

            <div id="resultadoIA"></div>
        `,

        semantic: `
            <h2>Fase 5 · Capa Semántica</h2>

            <p class="panel-desc">
            KPIs, métricas y reglas de negocio calculadas
            sobre el Data Warehouse.
            </p>

            <button class="btn-upload" onclick="ejecutarSemantica()">
                Calcular KPIs
            </button>

            <div id="resultadoSemantica"></div>
        `,

        bi: `
            <h2>Fase 6 · Visualización BI</h2>

            <p class="panel-desc">
            Dashboard con gráficos interactivos del pipeline completo.
            </p>

            <button class="btn-upload" onclick="runDashboard()">
                Cargar Dashboard
            </button>

            <div id="dashboard-panel">

                <div id="dashboard-kpis" style="display:none">
                    <div class="kpi-grid" id="kpiCards"></div>
                </div>

                <div id="dashboard-charts" style="display:none;margin-top:30px">
                    <div id="dashboard-view">
                        <canvas id="chartUni"></canvas>
                        <canvas id="chartProg"></canvas>
                        <canvas id="chartSexo"></canvas>
                    </div>
                </div>

            </div>
        `,
    };

    panel.innerHTML = vistas[modulo] ?? `<h2>${modulo}</h2>`;
}


// ==========================
// UPLOAD
// ==========================

async function subirArchivo() {

    const file = document.getElementById("fileInput").files[0];

    if (!file) {
        alert("Seleccione un archivo");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    document.getElementById("resultadoUpload").innerHTML = `
    <div class="loading-card">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <p>Procesando archivo...</p>
    </div>`;

    try {

        const response = await fetch("http://localhost:8000/upload", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!data.success) throw new Error(data.message);

        let html = `<h3 style="margin:16px 0 8px">${data.rows} registros encontrados</h3>`;

        if (data.errores.length) {

            html += `<div class="error-card"><i class="fa-solid fa-triangle-exclamation"></i><div><h3>Errores de validación</h3><ul>`;
            data.errores.forEach(e => { html += `<li>${e}</li>`; });
            html += `</ul></div></div>`;

        } else {

            html += `<div class="success-card">
                <i class="fa-solid fa-circle-check"></i>
                <div>
                    <h3>Archivo válido</h3>
                    <p>✅ Guardado en Staging correctamente</p>
                </div>
            </div>`;

            window.uploadDone = true;
        }

        html += `<h4 style="margin:20px 0 8px">Preview (primeras 10 filas)</h4>
                 <div class="table-container"><table><tr>`;

        data.columns.forEach(c => { html += `<th>${c}</th>`; });
        html += `</tr>`;

        data.preview.forEach(r => {
            html += `<tr>`;
            data.columns.forEach(c => { html += `<td>${r[c] ?? ''}</td>`; });
            html += `</tr>`;
        });

        html += `</table></div>`;

        document.getElementById("resultadoUpload").innerHTML = html;

    } catch (err) {

        document.getElementById("resultadoUpload").innerHTML = `
        <div class="error-card">
            <i class="fa-solid fa-xmark"></i>
            <p>${err.message}</p>
        </div>`;
    }
}


// ==========================
// VALIDACIÓN
// ==========================

async function ejecutarValidacion() {

    const el = document.getElementById("resultadoValidacion");

    if (!window.uploadDone) {
        el.innerHTML = `
        <div class="error-card">
            <i class="fa-solid fa-lock"></i>
            <div><h3>Carga requerida</h3><p>Primero suba un archivo en "Fuentes de Datos".</p></div>
        </div>`;
        return;
    }

    el.innerHTML = `
    <div class="loading-card">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <div><p>Revisando dataset...</p><small>✓ columnas &nbsp; ✓ tipos &nbsp; ✓ nulos &nbsp; ✓ duplicados</small></div>
    </div>`;

    try {

        const response = await fetch("http://127.0.0.1:8000/validate", { method: "POST" });
        const data = await response.json();

        if (!data.success) throw new Error(data.message);

        if (data.valid) {

            el.innerHTML = `
            <div class="success-card">
                <i class="fa-solid fa-circle-check"></i>
                <div><h3>Dataset válido</h3><p>${data.rows} registros validados correctamente</p></div>
            </div>`;

            window.validationDone = true;

        } else {

            el.innerHTML = `
            <div class="error-card">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <div>
                    <h3>Se encontraron errores</h3>
                    <ul>${data.errores.map(e => `<li>${e}</li>`).join("")}</ul>
                </div>
            </div>`;

            window.validationDone = false;
        }

    } catch (err) {
        el.innerHTML = `<div class="error-card"><i class="fa-solid fa-xmark"></i><p>${err.message}</p></div>`;
    }
}


// ==========================
// ETL
// ==========================

async function ejecutarETL() {

    const el = document.getElementById("resultadoETL");

    if (!window.validationDone) {
        el.innerHTML = `
        <div class="error-card">
            <i class="fa-solid fa-lock"></i>
            <div><h3>Validación requerida</h3><p>Primero valide el dataset en "Staging".</p></div>
        </div>`;
        return;
    }

    el.innerHTML = `
    <div class="loading-card">
        <i class="fa-solid fa-gears fa-spin"></i>
        <div><h3>Ejecutando ETL</h3><p>EXTRACT ✓<br>TRANSFORM ✓<br>LOAD ✓</p></div>
    </div>`;

    try {

        const response = await fetch("http://127.0.0.1:8000/etl", { method: "POST" });
        const data = await response.json();

        if (!data.success) throw new Error(data.message);

        el.innerHTML = `
        <div class="success-card">
            <i class="fa-solid fa-database"></i>
            <div>
                <h3>ETL completado</h3>
                <p>
                    Universidades: <strong>${data.data.universidades}</strong><br>
                    Programas: <strong>${data.data.programas}</strong><br>
                    Fechas: <strong>${data.data.tiempos}</strong><br>
                    Facts: <strong>${data.data.facts}</strong>
                </p>
            </div>
        </div>`;

        window.etlDone = true;

    } catch (err) {
        el.innerHTML = `<div class="error-card"><i class="fa-solid fa-xmark"></i><p>${err.message}</p></div>`;
        window.etlDone = false;
    }
}


// ==========================
// DATA WAREHOUSE
// ==========================

function generarDW() {

    const el = document.getElementById("resultadoDW");

    if (!window.etlDone) {
        el.innerHTML = `
        <div class="error-card">
            <i class="fa-solid fa-lock"></i>
            <div><h3>ETL requerido</h3><p>Primero ejecute el proceso ETL.</p></div>
        </div>`;
        return;
    }

    el.innerHTML = `
    <div class="loading-card">
        <i class="fa-solid fa-diagram-project fa-spin"></i>
        <div><h3>Generando modelo estrella...</h3></div>
    </div>`;

    setTimeout(() => {

        el.innerHTML = `
        <div class="dw-info" style="margin-bottom:20px">
            <h3>✅ Modelo Estrella generado</h3>
            <p style="margin-top:6px;color:#475569">
                3 dimensiones · 1 tabla de hechos · relaciones por clave foránea
            </p>
        </div>

        <div class="star-schema">

            <!-- FACT central -->
            <div class="star-fact" id="sf-fact">
                <div class="star-label">FACT</div>
                <strong>fact_egresados</strong>
                <div class="star-cols">id_fact · id_universidad<br>id_programa · id_tiempo<br>promedio · edad · sexo</div>
            </div>

            <!-- DIM superior -->
            <div class="star-dim" id="sf-uni" style="grid-area:top">
                <div class="star-label">DIM</div>
                <strong>dim_universidad</strong>
                <div class="star-cols">id_universidad · universidad<br>tipo_gestión · licenciado</div>
            </div>

            <!-- DIM izquierda -->
            <div class="star-dim" id="sf-prog" style="grid-area:left">
                <div class="star-label">DIM</div>
                <strong>dim_programa</strong>
                <div class="star-cols">id_programa · programa</div>
            </div>

            <!-- DIM derecha -->
            <div class="star-dim" id="sf-tiempo" style="grid-area:right">
                <div class="star-label">DIM</div>
                <strong>dim_tiempo</strong>
                <div class="star-cols">id_tiempo · fecha_egreso<br>año · mes</div>
            </div>

            <!-- SVG líneas de relación -->
            <svg class="star-svg" id="star-svg"></svg>

        </div>
        `;

        window.dwDone = true;
        requestAnimationFrame(() => dibujarLineasEstrella());

    }, 1200);
}

function dibujarLineasEstrella() {

    const svg    = document.getElementById("star-svg");
    const schema = svg?.closest(".star-schema");
    if (!svg || !schema) return;

    const rect = schema.getBoundingClientRect();

    function centro(id) {
        const el = document.getElementById(id);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
            x: r.left - rect.left + r.width  / 2,
            y: r.top  - rect.top  + r.height / 2
        };
    }

    const fact = centro("sf-fact");
    const dims = [centro("sf-uni"), centro("sf-prog"), centro("sf-tiempo")];

    svg.setAttribute("width",  schema.offsetWidth);
    svg.setAttribute("height", schema.offsetHeight);

    let html = "";
    dims.forEach(d => {
        if (!d) return;
        html += `<line x1="${fact.x}" y1="${fact.y}" x2="${d.x}" y2="${d.y}"
                  stroke="#3b82f6" stroke-width="2.5" stroke-dasharray="6 4" opacity="0.75"/>`;
        html += `<circle cx="${d.x}" cy="${d.y}" r="5" fill="#3b82f6"/>`;
    });
    html += `<circle cx="${fact.x}" cy="${fact.y}" r="8" fill="#16a34a"/>`;
    svg.innerHTML = html;
}


// ==========================
// IA
// ==========================

async function ejecutarIA() {

    const el = document.getElementById("resultadoIA");

    if (!window.dwDone) {
        el.innerHTML = `
        <div class="error-card">
            <i class="fa-solid fa-lock"></i>
            <p>Primero genere el Data Warehouse.</p>
        </div>`;
        return;
    }

    el.innerHTML = `
    <div class="loading-card">
        <i class="fa-solid fa-brain fa-spin"></i>
        <div><h3>Entrenando IA...</h3><p>preparando datos<br>entrenando modelo<br>evaluando precisión</p></div>
    </div>`;

    try {

        const response = await fetch("http://127.0.0.1:8000/ia", { method: "POST" });
        const data = await response.json();

        if (!data.success) throw new Error(data.message);

        const imp = data.data.importancias;
        const labelNames = {
            edad:              "Edad",
            tipo_gestion_cod:  "Tipo de gestión",
            licenciado_cod:    "Licenciado",
            anio:              "Año de egreso"
        };

        const impHTML = Object.entries(imp)
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => `<li>${labelNames[k] ?? k}: <strong>${(v * 100).toFixed(1)}%</strong></li>`)
            .join("");

        el.innerHTML = `
        <div class="success-card">
            <i class="fa-solid fa-brain"></i>
            <div>
                <h3>Modelo entrenado</h3>
                <p>
                    R² Score: <strong>${data.data.score_r2}</strong><br>
                    MAE: <strong>${data.data.error_mae}</strong>
                </p>
                <p style="margin-top:10px"><strong>Importancia de variables:</strong></p>
                <ul style="margin-left:16px">${impHTML}</ul>
            </div>
        </div>`;

        window.iaDone = true;

    } catch (err) {
        el.innerHTML = `<div class="error-card"><i class="fa-solid fa-xmark"></i><p>${err.message}</p></div>`;
    }
}


// ==========================
// SEMÁNTICA
// ==========================

async function ejecutarSemantica() {

    const el = document.getElementById("resultadoSemantica");

    if (!window.etlDone) {
        el.innerHTML = `
        <div class="error-card">
            <i class="fa-solid fa-lock"></i>
            <div><h3>ETL requerido</h3><p>Primero ejecute el ETL.</p></div>
        </div>`;
        return;
    }

    el.innerHTML = `
    <div class="loading-card">
        <i class="fa-solid fa-chart-line fa-spin"></i>
        <p>Calculando KPIs...</p>
    </div>`;

    try {

        const response = await fetch("http://127.0.0.1:8000/semantic", { method: "POST" });
        const data = await response.json();

        if (!data.success) throw new Error(data.message);

        const d = data.data;

        const topUni = d.top_universidades
            .map(u => `<li>${u.universidad}: <strong>${u.egresados}</strong></li>`)
            .join("");

        const topProg = d.top_programas
            .map(p => `<li>${p.programa}: <strong>${p.egresados}</strong></li>`)
            .join("");

        el.innerHTML = `
        <div class="success-card" style="flex-direction:column;align-items:stretch">
            <div style="display:flex;gap:15px;align-items:center">
                <i class="fa-solid fa-circle-check" style="color:#16a34a;font-size:1.8rem"></i>
                <h3>KPIs calculados</h3>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-top:18px">
                <div class="kpi-box"><p>Total egresados</p><h2>${d.total_egresados.toLocaleString()}</h2></div>
                <div class="kpi-box"><p>Promedio general</p><h2>${d.promedio_general}</h2></div>
                <div class="kpi-box"><p>Edad promedio</p><h2>${d.promedio_edad}</h2></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px">
                <div><h4>Top Universidades</h4><ul style="margin-left:16px;margin-top:8px">${topUni}</ul></div>
                <div><h4>Top Programas</h4><ul style="margin-left:16px;margin-top:8px">${topProg}</ul></div>
            </div>
        </div>`;

        window.semanticDone = true;

    } catch (err) {
        el.innerHTML = `<div class="error-card"><i class="fa-solid fa-xmark"></i><p>${err.message}</p></div>`;
    }
}


// ==========================
// DASHBOARD
// ==========================

async function runDashboard() {

    if (!window.etlDone) {
        document.getElementById("dashboard-panel").innerHTML = `
        <div class="error-card" style="margin-top:20px">
            <i class="fa-solid fa-lock"></i>
            <div><h3>ETL requerido</h3><p>Primero ejecute el proceso ETL.</p></div>
        </div>`;
        return;
    }

    document.getElementById("dashboard-panel").innerHTML = `
    <div class="loading-card" style="margin-top:20px">
        <i class="fa-solid fa-chart-pie fa-spin"></i>
        <p>Cargando dashboard...</p>
    </div>`;

    try {

        const res = await fetch("http://127.0.0.1:8000/dashboard", { method: "POST" });
        const data = await res.json();

        if (!data.success) throw new Error(data.message);

        document.getElementById("dashboard-panel").innerHTML = `
        <div id="dashboard-view" style="margin-top:25px">
            <canvas id="chartUni"></canvas>
            <canvas id="chartProg"></canvas>
            <canvas id="chartSexo"></canvas>
        </div>`;

        drawCharts(data.data);

    } catch (err) {
        document.getElementById("dashboard-panel").innerHTML = `
        <div class="error-card" style="margin-top:20px">
            <i class="fa-solid fa-xmark"></i>
            <p>${err.message}</p>
        </div>`;
    }
}

function drawCharts(data) {

    const colores = [
        "#2563eb","#16a34a","#ea580c","#9333ea","#ca8a04",
        "#0f766e","#dc2626","#4338ca","#0369a1","#15803d"
    ];

    const c1 = new Chart(document.getElementById("chartUni"), {
        type: "bar",
        data: {
            labels: data.universidades.map(x => x.universidad),
            datasets: [{
                label: "Egresados por universidad",
                data: data.universidades.map(x => x.cantidad),
                backgroundColor: colores,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } }
        }
    });

    const c2 = new Chart(document.getElementById("chartProg"), {
        type: "pie",
        data: {
            labels: data.programas.map(x => x.programa),
            datasets: [{
                data: data.programas.map(x => x.cantidad),
                backgroundColor: colores
            }]
        },
        options: { responsive: true }
    });

    const c3 = new Chart(document.getElementById("chartSexo"), {
        type: "doughnut",
        data: {
            labels: data.sexo.map(x => x.sexo),
            datasets: [{
                data: data.sexo.map(x => x.cantidad),
                backgroundColor: ["#2563eb", "#ea580c"]
            }]
        },
        options: { responsive: true }
    });

    chartsActivos.push(c1, c2, c3);
}


// ==========================
// HELPERS
// ==========================

function mostrarNombreArchivo() {

    const file = document.getElementById("fileInput").files[0];
    if (!file) return;

    document.getElementById("fileInfo").innerHTML = `
    <div class="file-card">
        <i class="fa-solid fa-file"></i>
        <div>
            <strong>${file.name}</strong>
            <p>${(file.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
    </div>`;
}
