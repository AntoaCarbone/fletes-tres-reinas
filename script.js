// ==========================================================
// Fletes Tres Reinas - script.js
// Maneja: menú móvil, validación de formulario, consumo de API (fetch)
// y carrito de compras dinámico con localStorage
// ==========================================================

const FORMATO_PRECIO = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0
});

document.addEventListener('DOMContentLoaded', () => {
  initMenu();
  initFormulario();
  initCarrito();
  cargarPlanes();
});

// ----------------------------------------------------------
// 1) MENÚ MÓVIL (manipulación del DOM)
// ----------------------------------------------------------
function initMenu() {
  const boton = document.getElementById('menu-toggle');
  const menu = document.getElementById('menu-principal');
  if (!boton || !menu) return;

  boton.addEventListener('click', () => {
    const abierto = menu.classList.toggle('abierto');
    boton.classList.toggle('activo', abierto);
    boton.setAttribute('aria-expanded', abierto ? 'true' : 'false');
  });

  // Cierra el menú al tocar un link (útil en mobile)
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.remove('abierto');
      boton.classList.remove('activo');
      boton.setAttribute('aria-expanded', 'false');
    });
  });
}

// ----------------------------------------------------------
// 2) VALIDACIÓN DE FORMULARIO (DOM + regex)
// ----------------------------------------------------------
function initFormulario() {
  const form = document.getElementById('form-contacto');
  if (!form) return;

  const mensajeBox = document.getElementById('form-mensaje');

  // Reglas de validación por campo
  const reglas = {
    nombre: valor => valor.trim().length >= 2 || 'Ingresá un nombre válido',
    apellido: valor => valor.trim().length >= 2 || 'Ingresá un apellido válido',
    mail: valor => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim()) || 'Ingresá un email válido (ej: nombre@mail.com)',
    celular: valor => /^[0-9+\s()-]{6,20}$/.test(valor.trim()) || 'Ingresá un número de celular válido',
    desde: valor => valor.trim().length >= 2 || 'Contanos desde qué barrio salís',
    hasta: valor => valor.trim().length >= 2 || 'Contanos hasta qué barrio vas',
    opciones: valor => valor !== '' || 'Elegí un servicio',
    detalles: valor => valor.trim().length >= 5 || 'Contanos un poco más sobre el traslado'
  };

  // Valida un campo puntual y pinta/limpia el error en el DOM
  function validarCampo(campo) {
    const regla = reglas[campo.name];
    if (!regla) return true;

    const resultado = regla(campo.value);
    limpiarError(campo);

    if (resultado !== true) {
      mostrarError(campo, resultado);
      return false;
    }
    return true;
  }

  function mostrarError(campo, mensaje) {
    campo.classList.add('campo-invalido');
    const idError = `error-${campo.name}`;
    let error = document.getElementById(idError);
    if (!error) {
      error = document.createElement('span');
      error.id = idError;
      error.className = 'error-mensaje';
      campo.insertAdjacentElement('afterend', error);
    }
    error.textContent = mensaje;
  }

  function limpiarError(campo) {
    campo.classList.remove('campo-invalido');
    const error = document.getElementById(`error-${campo.name}`);
    if (error) error.remove();
  }

  // Validación en vivo al salir de cada campo
  Object.keys(reglas).forEach(nombre => {
    const campo = form.elements[nombre];
    if (campo) campo.addEventListener('blur', () => validarCampo(campo));
  });

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    let formularioValido = true;
    Object.keys(reglas).forEach(nombre => {
      const campo = form.elements[nombre];
      if (campo && !validarCampo(campo)) formularioValido = false;
    });

    if (!formularioValido) {
      mostrarMensaje('Revisá los campos marcados en rojo', 'error');
      return;
    }

    const botonEnviar = form.querySelector('button[type="submit"]');
    const textoOriginal = botonEnviar.textContent;
    botonEnviar.disabled = true;
    botonEnviar.textContent = 'Enviando...';

    try {
      const respuesta = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });

      if (respuesta.ok) {
        mostrarMensaje('¡Gracias! Recibimos tu consulta y te vamos a contactar a la brevedad.', 'exito');
        form.reset();
      } else {
        mostrarMensaje('No pudimos enviar tu consulta. Probá nuevamente en unos minutos.', 'error');
      }
    } catch (err) {
      mostrarMensaje('Hubo un problema de conexión. Probá nuevamente.', 'error');
    } finally {
      botonEnviar.disabled = false;
      botonEnviar.textContent = textoOriginal;
    }
  });

  function mostrarMensaje(texto, tipo) {
    if (!mensajeBox) return;
    mensajeBox.textContent = texto;
    mensajeBox.className = `form-mensaje ${tipo} visible`;
    mensajeBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ----------------------------------------------------------
// 3) FETCH API: trae los planes/tarifas y los pinta como tarjetas
// ----------------------------------------------------------
async function cargarPlanes() {
  const contenedor = document.getElementById('contenedor-tarjetas');
  if (!contenedor) return;

  try {
    const respuesta = await fetch('data/servicios.json');
    if (!respuesta.ok) throw new Error('Respuesta no válida del servidor');

    const planes = await respuesta.json();
    pintarTarjetas(planes, contenedor);
  } catch (error) {
    contenedor.innerHTML = '<p class="error-carga">No pudimos cargar los planes en este momento.</p>';
    console.error('Error al cargar planes:', error);
  }
}

function pintarTarjetas(planes, contenedor) {
  contenedor.innerHTML = ''; // limpia el "Cargando..."

  planes.forEach(plan => {
    const tarjeta = document.createElement('article');
    tarjeta.className = 'tarjeta-plan';

    const img = document.createElement('img');
    img.src = plan.imagen;
    img.alt = plan.titulo;
    img.loading = 'lazy';

    const titulo = document.createElement('h3');
    titulo.textContent = plan.titulo;

    const descripcion = document.createElement('p');
    descripcion.className = 'tarjeta-descripcion';
    descripcion.textContent = plan.descripcion;

    const precio = document.createElement('p');
    precio.className = 'tarjeta-precio';
    precio.textContent = `Desde ${FORMATO_PRECIO.format(plan.precio)}`;

    const acciones = document.createElement('div');
    acciones.className = 'tarjeta-acciones';

    const botonCarrito = document.createElement('button');
    botonCarrito.type = 'button';
    botonCarrito.className = 'boton boton-tarjeta';
    botonCarrito.textContent = 'Agregar al carrito';
    botonCarrito.addEventListener('click', () => agregarAlCarrito(plan));

    const enlace = document.createElement('a');
    enlace.href = '#contacto';
    enlace.className = 'boton boton-secundario boton-tarjeta';
    enlace.textContent = 'Pedir presupuesto';

    acciones.append(botonCarrito, enlace);
    tarjeta.append(img, titulo, descripcion, precio, acciones);
    contenedor.appendChild(tarjeta);
  });
}

// ----------------------------------------------------------
// 4) CARRITO DE COMPRAS (localStorage + DOM dinámico)
// ----------------------------------------------------------
const CARRITO_STORAGE_KEY = 'ftr_carrito';

function obtenerCarrito() {
  try {
    const datos = localStorage.getItem(CARRITO_STORAGE_KEY);
    return datos ? JSON.parse(datos) : [];
  } catch (error) {
    console.error('No se pudo leer el carrito de localStorage:', error);
    return [];
  }
}

function guardarCarrito(carrito) {
  localStorage.setItem(CARRITO_STORAGE_KEY, JSON.stringify(carrito));
  actualizarContador(carrito);
  renderizarCarrito(carrito);
}

// Agrega un producto (plan) al carrito, o suma 1 si ya estaba
function agregarAlCarrito(plan) {
  const carrito = obtenerCarrito();
  const existente = carrito.find(item => item.id === plan.id);

  if (existente) {
    existente.cantidad += 1;
  } else {
    carrito.push({
      id: plan.id,
      titulo: plan.titulo,
      precio: plan.precio,
      imagen: plan.imagen,
      cantidad: 1
    });
  }

  guardarCarrito(carrito);
  abrirCarrito();
}

// Cambia la cantidad de un producto (delta puede ser +1 o -1)
function cambiarCantidad(id, delta) {
  const carrito = obtenerCarrito();
  const item = carrito.find(producto => producto.id === id);
  if (!item) return;

  item.cantidad += delta;

  if (item.cantidad <= 0) {
    eliminarDelCarrito(id);
    return;
  }

  guardarCarrito(carrito);
}

// Fija una cantidad exacta escrita a mano en el input numérico
function fijarCantidad(id, cantidad) {
  const carrito = obtenerCarrito();
  const item = carrito.find(producto => producto.id === id);
  if (!item) return;

  const nueva = Math.max(1, Math.floor(Number(cantidad)) || 1);
  item.cantidad = nueva;
  guardarCarrito(carrito);
}

function eliminarDelCarrito(id) {
  const carrito = obtenerCarrito().filter(producto => producto.id !== id);
  guardarCarrito(carrito);
}

function vaciarCarrito() {
  guardarCarrito([]);
}

function calcularTotal(carrito) {
  return carrito.reduce((total, item) => total + item.precio * item.cantidad, 0);
}

function calcularCantidadTotal(carrito) {
  return carrito.reduce((total, item) => total + item.cantidad, 0);
}

// Actualiza el contador numérico del ícono del carrito (tiempo real)
function actualizarContador(carrito = obtenerCarrito()) {
  const contador = document.getElementById('carrito-contador');
  if (!contador) return;
  contador.textContent = calcularCantidadTotal(carrito);
}

// Repinta la lista de productos del carrito y el total
function renderizarCarrito(carrito = obtenerCarrito()) {
  const contenedor = document.getElementById('carrito-items');
  const totalMonto = document.getElementById('carrito-total-monto');
  if (!contenedor || !totalMonto) return;

  contenedor.innerHTML = '';

  if (carrito.length === 0) {
    contenedor.innerHTML = '<p class="carrito-vacio">Todavía no agregaste ningún plan.</p>';
    totalMonto.textContent = FORMATO_PRECIO.format(0);
    return;
  }

  carrito.forEach(item => {
    const fila = document.createElement('div');
    fila.className = 'carrito-item';

    const img = document.createElement('img');
    img.src = item.imagen;
    img.alt = item.titulo;

    const info = document.createElement('div');
    info.className = 'carrito-item-info';

    const titulo = document.createElement('p');
    titulo.className = 'carrito-item-titulo';
    titulo.textContent = item.titulo;

    const precioUnitario = document.createElement('p');
    precioUnitario.className = 'carrito-item-precio';
    precioUnitario.textContent = `${FORMATO_PRECIO.format(item.precio)} c/u`;

    const controles = document.createElement('div');
    controles.className = 'carrito-item-controles';

    const botonMenos = document.createElement('button');
    botonMenos.type = 'button';
    botonMenos.className = 'carrito-cantidad-boton';
    botonMenos.textContent = '−';
    botonMenos.setAttribute('aria-label', `Restar unidad de ${item.titulo}`);
    botonMenos.addEventListener('click', () => cambiarCantidad(item.id, -1));

    const inputCantidad = document.createElement('input');
    inputCantidad.type = 'number';
    inputCantidad.min = '1';
    inputCantidad.value = item.cantidad;
    inputCantidad.className = 'carrito-cantidad-input';
    inputCantidad.setAttribute('aria-label', `Cantidad de ${item.titulo}`);
    inputCantidad.addEventListener('change', (evento) => fijarCantidad(item.id, evento.target.value));

    const botonMas = document.createElement('button');
    botonMas.type = 'button';
    botonMas.className = 'carrito-cantidad-boton';
    botonMas.textContent = '+';
    botonMas.setAttribute('aria-label', `Sumar unidad de ${item.titulo}`);
    botonMas.addEventListener('click', () => cambiarCantidad(item.id, 1));

    controles.append(botonMenos, inputCantidad, botonMas);

    const subtotal = document.createElement('p');
    subtotal.className = 'carrito-item-subtotal';
    subtotal.textContent = FORMATO_PRECIO.format(item.precio * item.cantidad);

    const botonEliminar = document.createElement('button');
    botonEliminar.type = 'button';
    botonEliminar.className = 'carrito-item-eliminar';
    botonEliminar.textContent = 'Eliminar';
    botonEliminar.addEventListener('click', () => eliminarDelCarrito(item.id));

    info.append(titulo, precioUnitario, controles);
    fila.append(img, info, subtotal, botonEliminar);
    contenedor.appendChild(fila);
  });

  totalMonto.textContent = FORMATO_PRECIO.format(calcularTotal(carrito));
}

function abrirCarrito() {
  document.getElementById('carrito-panel')?.classList.add('abierto');
  document.getElementById('carrito-overlay')?.classList.add('visible');
  document.getElementById('carrito-panel')?.setAttribute('aria-hidden', 'false');
}

function cerrarCarrito() {
  document.getElementById('carrito-panel')?.classList.remove('abierto');
  document.getElementById('carrito-overlay')?.classList.remove('visible');
  document.getElementById('carrito-panel')?.setAttribute('aria-hidden', 'true');
}

function initCarrito() {
  const botonAbrir = document.getElementById('carrito-toggle');
  const botonCerrar = document.getElementById('carrito-cerrar');
  const overlay = document.getElementById('carrito-overlay');
  const botonVaciar = document.getElementById('carrito-vaciar');

  botonAbrir?.addEventListener('click', abrirCarrito);
  botonCerrar?.addEventListener('click', cerrarCarrito);
  overlay?.addEventListener('click', cerrarCarrito);
  botonVaciar?.addEventListener('click', () => {
    if (confirm('¿Vaciar todos los productos del carrito?')) vaciarCarrito();
  });

  // Carga inicial desde localStorage: el carrito persiste entre visitas
  const carritoInicial = obtenerCarrito();
  actualizarContador(carritoInicial);
  renderizarCarrito(carritoInicial);
}
