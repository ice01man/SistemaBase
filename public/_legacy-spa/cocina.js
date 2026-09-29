async function calcularNecesidad() {
    const prodId = document.getElementById('prodSelect').value;
    const cantidad = document.getElementById('cantViandas').value;
    
    if(!prodId || !cantidad) return alert('Seleccioná plato y cantidad');

    const res = await fetch('/api/productos/verificar-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('brie_token')}` },
        body: JSON.stringify({ producto_id: prodId, cantidad_viandas: Number(cantidad) })
    });

    const data = await res.json();
    renderResultado(data);
}

function renderResultado(data) {
    const div = document.getElementById('resultadoCalculo');
    
    let html = `<h4 style="margin-bottom:10px;">Para ${data.cantidad_viandas} "${data.producto}":</h4>`;
    
    // Cabecera
    html += `<table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead><tr style="background:#f3f4f6; text-align:left;">
            <th style="padding:8px;">Insumo</th>
            <th style="padding:8px;">Necesario</th>
            <th style="padding:8px;">Disponible</th>
            <th style="padding:8px;">Estado</th>
        </tr></thead><tbody>`;

    data.detalle_materiales.forEach(item => {
        const color = item.estado === 'ok' ? '#10b981' : '#ef4444'; // Verde o Rojo
        const icon = item.estado === 'ok' ? 'fa-check-circle' : 'fa-times-circle';
        
        html += `<tr style="border-bottom:1px solid #eee;">
            <td style="padding:8px;">${item.insumo_nombre}</td>
            <td style="padding:8px; font-weight:700;">${item.total_requerido} ${item.unidad}</td>
            <td style="padding:8px;">${item.disponible} ${item.unidad}</td>
            <td style="padding:8px; color:${color}; font-weight:700;">
                ${item.falta > 0 ? `FALTAN ${item.falta} ${item.unidad}` : 'OK'}
            </td>
        </tr>`;
    });

    html += `</tbody></table>`;
    div.innerHTML = html;
}