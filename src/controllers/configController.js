import Config from '../models/Config.js';

const USA_MONGO = process.env.PERSISTENCIA === 'mongo';
let temaMemoria = 'violeta'; // fallback cuando corrés sin base

// GET /api/config → público, lo lee el front al cargar
export const getConfig = async (req, res) => {
  try {
    if (!USA_MONGO) return res.json({ tema: temaMemoria });
    let cfg = await Config.findOne({ clave: 'sitio' });
    if (!cfg) cfg = await Config.create({ clave: 'sitio' });
    res.json({ tema: cfg.tema });
  } catch (e) {
    console.error('❌ getConfig:', e);
    res.status(500).json({ error: 'No se pudo leer la configuración' });
  }
};

// PATCH /api/config → solo admin
export const updateConfig = async (req, res) => {
  try {
    const { tema } = req.body;
    if (!['violeta', 'trueno', 'bosque'].includes(tema)) {
      return res.status(400).json({ error: 'Tema inválido' });
    }
    if (!USA_MONGO) {           // modo memoria: guardo en RAM
      temaMemoria = tema;
      return res.json({ tema: temaMemoria });
    }
    const cfg = await Config.findOneAndUpdate(
      { clave: 'sitio' }, { tema }, { new: true, upsert: true }
    );
    res.json({ tema: cfg.tema });
  } catch (e) {
    console.error('❌ updateConfig:', e);
    res.status(500).json({ error: 'No se pudo guardar la configuración' });
  }
};