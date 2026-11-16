import { useEffect, useState, type FormEvent } from "react";
import { Icon } from "./Icon";

type User = { id: string; email: string; name: string; createdAt: string };
type Mode = "login" | "register";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { ...options, credentials: "include", headers: { "Content-Type": "application/json", ...options.headers } });
  if (response.status === 204) return undefined as T;
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "No se pudo completar la solicitud");
  return result as T;
}

export default function App() {
  const [mode, setMode] = useState<Mode>("login");
  const [user, setUser] = useState<User | null>(null);
  const [csrf, setCsrf] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([request<{ csrfToken: string }>("/api/auth/csrf"), request<{ user: User | null }>("/api/auth/me")])
      .then(([security, auth]) => { setCsrf(security.csrfToken); setUser(auth.user); })
      .catch(() => setError("No pudimos conectar con el servidor. Comprueba que esté iniciado e inténtalo otra vez."))
      .finally(() => setLoading(false));
  }, []);

  const changeMode = (next: Mode) => { setMode(next); setError(""); setPassword(""); };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setSubmitting(true);
    try {
      const result = await request<{ user: User; csrfToken: string }>(`/api/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        headers: { "X-CSRF-Token": csrf },
        body: JSON.stringify(mode === "login" ? { email, password, remember } : { name, email, password }),
      });
      setUser(result.user); setCsrf(result.csrfToken); setPassword("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo iniciar sesión"); }
    finally { setSubmitting(false); }
  }

  async function logout() {
    setError("");
    try {
      await request<void>("/api/auth/logout", { method: "POST", headers: { "X-CSRF-Token": csrf } });
      setUser(null); setPassword(""); setCsrf((await request<{ csrfToken: string }>("/api/auth/csrf")).csrfToken);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cerrar la sesión"); }
  }

  if (loading) return <main className="loading-screen"><span className="loader" aria-label="Cargando" /></main>;

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Acceso, inicio"><span className="brand-mark"><Icon name="sparkles" size={17} strokeWidth={2.4} /></span><span>Acceso</span></a>
        <div className="topbar-right"><span className="secure-note"><span className="secure-dot" /> Conexión segura</span></div>
      </header>

      <section className="main-grid" id="inicio">
        <div className="story-panel">
          <div className="story-content">
            <div className="eyebrow"><span className="eyebrow-line" /> TU ESPACIO, A TU MANERA</div>
            <h1>Todo lo que<br />imaginas, <span>en un<br className="desktop-break" /> solo lugar.</span></h1>
            <p className="story-copy">Un espacio tranquilo para tus ideas, tus proyectos y todo lo que está por venir.</p>
            <div className="feature-list">
            <div className="feature"><span className="feature-icon"><Icon name="fingerprint" size={18} /></span><span><strong>Privacidad primero</strong><small>Tus datos siempre son tuyos</small></span><span className="feature-check"><Icon name="check" size={15} /></span></div>
              <div className="feature"><span className="feature-icon"><Icon name="lock" size={17} /></span><span><strong>Acceso protegido</strong><small>Seguridad en cada paso</small></span><span className="feature-check"><Icon name="check" size={15} /></span></div>
            </div>
          </div>
          <div className="artwork" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" /><div className="art-core"><Icon name="sparkles" size={30} strokeWidth={1.25} /></div><span className="art-star star-a">✳</span><span className="art-star star-b">✦</span><span className="art-star star-c">✧</span><span className="art-dot dot-a" /><span className="art-dot dot-b" /></div>
          <div className="panel-footer"><span>HECHO PARA LO QUE SIGUE</span><span>01 <i /> 03</span></div>
        </div>

        <div className="form-panel">
          <div className="form-card">
            {user ? <>
              <div className="success-icon"><Icon name="check" size={24} /></div>
              <span className="form-kicker">SESIÓN ACTIVA</span>
              <h2>Qué bueno verte,<br />{user.name.split(" ")[0]}.</h2>
              <p className="form-intro">Has iniciado sesión de forma segura con <strong>{user.email}</strong>.</p>
              {error && <div className="alert error-alert" role="alert"><Icon name="x" size={17} />{error}</div>}
              <div className="session-card"><span className="session-avatar">{user.name.slice(0, 1).toUpperCase()}</span><span className="session-details"><strong>{user.name}</strong><small>Tu espacio está listo</small></span><span className="online-dot" /></div>
              <button className="submit-button logout-button" onClick={logout}>Cerrar sesión <Icon name="arrowRight" size={17} /></button>
              <div className="form-footnote"><Icon name="shield" size={15} /> Tu sesión está protegida y cifrada</div>
            </> : <>
              <div className="form-heading"><span className="form-kicker">{mode === "login" ? "BIENVENIDO DE NUEVO" : "EMPIEZA ALGO NUEVO"}</span><h2>{mode === "login" ? <>Qué bueno<br />tenerte <span>de vuelta.</span></> : <>Tu próximo capítulo<br /><span>empieza aquí.</span></>}</h2><p className="form-intro">{mode === "login" ? "Ingresa tus datos para entrar a tu espacio." : "Crea tu cuenta y encuentra tu espacio."}</p></div>
              <div className="mode-switch" role="tablist" aria-label="Tipo de acceso"><button role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => changeMode("login")}>Iniciar sesión</button><button role="tab" aria-selected={mode === "register"} className={mode === "register" ? "active" : ""} onClick={() => changeMode("register")}>Crear cuenta</button></div>
              <form onSubmit={handleSubmit} noValidate>
                {mode === "register" && <label className="field-label" htmlFor="name">Nombre completo<div className="input-wrap"><Icon name="user" size={18} /><input id="name" autoComplete="name" placeholder="¿Cómo te llamas?" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} required /></div></label>}
                <label className="field-label" htmlFor="email">Correo electrónico<div className="input-wrap"><Icon name="mail" size={18} /><input id="email" type="email" autoComplete="email" placeholder="tu@correo.com" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required /></div></label>
                <label className="field-label" htmlFor="password">Contraseña<div className="input-wrap"><Icon name="lock" size={18} /><input id="password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder={mode === "login" ? "Ingresa tu contraseña" : "Mínimo 10 caracteres"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={mode === "login" ? 1 : 10} maxLength={128} required /><button className="password-toggle" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? <Icon name="eyeOff" size={17} /> : <Icon name="eye" size={17} />}</button></div></label>
                {mode === "login" ? <div className="form-options"><label className="remember-option"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><span className="custom-check"><Icon name="check" size={12} /></span> Recordarme</label><span className="password-hint">Tu sesión dura 7 días</span></div> : <p className="password-hint registration-hint">Usa al menos 10 caracteres para proteger tu cuenta.</p>}
                {error && <div className="alert error-alert" role="alert"><Icon name="x" size={17} />{error}</div>}
                <button className="submit-button" type="submit" disabled={submitting || !csrf}>{submitting ? <><span className="button-loader" /> Un momento…</> : <>{mode === "login" ? "Entrar a mi espacio" : "Crear mi cuenta"}<Icon name="arrowRight" size={17} /></>}</button>
              </form>
              <div className="form-footnote"><Icon name="shield" size={15} /> Tus datos están protegidos y cifrados</div>
            </>}
          </div>
          <div className="copyright">Acceso seguro <span>·</span> Tu espacio personal</div>
        </div>
      </section>
    </main>
  );
}
