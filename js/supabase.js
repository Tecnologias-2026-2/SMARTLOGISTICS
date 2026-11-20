// Conexión con el backend en Supabase: base de datos PostgreSQL, autenticación
// y almacenamiento de fotografías. La clave publicable está pensada para vivir
// en el navegador: los datos los protegen las políticas RLS y las funciones de
// la base de datos (ver supabase/migrations).

const SUPABASE_URL = "https://tlnptbnaowykaanhvitq.supabase.co";
const SUPABASE_KEY = "sb_publishable_K-ndZrIKTrgvzIIfL8DQDA_8ZaAU7zC";

window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
