const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Base de datos temporal en memoria
let codigos = [];

// Obtener todos los códigos
app.get('/codigos', (req, res) => {
    res.status(200).json(codigos);
});

// Agregar un nuevo código
app.post('/codigos', (req, res) => {
    const { id, data, type } = req.body;

    if (!id || !data || !type) {
        return res.status(400).json({ message: 'Faltan campos requeridos' });
    }

    const nuevoCodigo = { id, data, type };
    codigos.push(nuevoCodigo);
    res.status(201).json({ message: 'Código agregado correctamente', codigo: nuevoCodigo });
});

// Eliminar un código por ID
app.delete('/codigos/:id', (req, res) => {
    const id = req.params.id;
    const index = codigos.findIndex(codigo => codigo.id === id);

    if (index === -1) {
        return res.status(404).json({ message: 'Código no encontrado' });
    }

    const eliminado = codigos.splice(index, 1);
    res.status(200).json({ message: 'Código eliminado correctamente', codigo: eliminado });
});

// Iniciar servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
