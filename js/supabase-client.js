// 🔐 Configuração do Supabase - SUBSTITUA com suas credenciais
const SUPABASE_URL = 'https://zkjljrxmnakwdtjdjgvr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpramxqcnhtbmFrd2R0amRqZ3ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MDg0NTQsImV4cCI6MjA3NTA4NDQ1NH0.YBafYqeWjGSr3qKZidWn3842Ec2bDF_CST3U0EqUr5E';

// Inicializar o cliente Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('✅ Supabase configurado');