/**
 * Pose `data-theme` avant le premier rendu.
 *
 * Sans ca, un utilisateur ayant choisi le mode clair sur un systeme en mode
 * sombre verrait un eclair sombre a chaque navigation. Le script est
 * volontairement minuscule et synchrone : c'est le seul cas ou bloquer le
 * rendu est le bon choix.
 */
export function ThemeScript() {
  const code = `try{var t=localStorage.getItem('dq-theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}`
  return <script dangerouslySetInnerHTML={{ __html: code }} />
}
