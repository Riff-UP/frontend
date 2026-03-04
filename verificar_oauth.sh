#!/bin/bash

echo "========================================"
echo "🔍 Verificación del flujo Google OAuth"
echo "========================================"
echo ""

# Verificar que el frontend esté corriendo
echo "1️⃣ Verificando frontend..."
if curl -s http://localhost:3001 > /dev/null; then
    echo "✅ Frontend corriendo en puerto 3001"
else
    echo "❌ Frontend NO está corriendo en puerto 3001"
    echo "   Ejecuta: npm run dev"
fi

echo ""

# Verificar que el backend esté corriendo
echo "2️⃣ Verificando backend..."
if curl -s http://localhost:4000/api > /dev/null; then
    echo "✅ Backend corriendo en puerto 4000"
else
    echo "❌ Backend NO está corriendo en puerto 4000"
    echo "   Verifica el backend y ejecútalo"
fi

echo ""

# Verificar ruta de Google OAuth
echo "3️⃣ Verificando ruta de Google OAuth..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/auth/google)
if [ "$RESPONSE" = "302" ] || [ "$RESPONSE" = "301" ]; then
    echo "✅ Ruta /api/auth/google responde con redirección ($RESPONSE)"
else
    echo "❌ Ruta /api/auth/google no responde correctamente (HTTP $RESPONSE)"
    echo "   Verifica la configuración del backend"
fi

echo ""

echo "========================================"
echo "📋 Pasos siguientes:"
echo "========================================"
echo "1. Abre http://localhost:3001/login en tu navegador"
echo "2. Haz clic en 'Continuar con Google'"
echo "3. Autentica con tu cuenta de Google"
echo "4. Deberías ser redirigido a http://localhost:3001/"
echo "5. Verifica que el token esté guardado:"
echo "   - Abre la consola del navegador (F12)"
echo "   - Escribe: localStorage.getItem('token')"
echo "   - Deberías ver tu JWT"
echo ""
echo "========================================"
echo "🐛 Si hay errores:"
echo "========================================"
echo "- Revisa BACKEND_CONFIG_GOOGLE_OAUTH.md"
echo "- Verifica los logs del backend"
echo "- Verifica la consola del navegador"
echo ""

