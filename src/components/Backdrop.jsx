// src/components/Backdrop.jsx
// Fondo fijo de la sala: luces de color muy tenues que se mueven lento
// (oro, verde paño, rubí y azul noche), un patrón art déco de escamas que solo
// se nota en los bordes, y una viñeta. Va detrás de todo y no recibe toques.

export default function Backdrop() {
  return (
    <div className="bg" aria-hidden="true">
      <span className="bg__light bg__light--gold" />
      <span className="bg__light bg__light--felt" />
      <span className="bg__light bg__light--ruby" />
      <span className="bg__light bg__light--night" />
      <span className="bg__deco" />
      <span className="bg__vignette" />
    </div>
  )
}
