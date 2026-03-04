@echo off
echo ========================================
echo Verificacion del flujo Google OAuth
echo ========================================
echo.

REM Verificar que el frontend este corriendo
echo 1. Verificando frontend...
curl -s http://localhost:3001 >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Frontend corriendo en puerto 3001
) else (
    echo [ERROR] Frontend NO esta corriendo en puerto 3001
    echo    Ejecuta: npm run dev
)

echo.

REM Verificar que el backend este corriendo
echo 2. Verificando backend...
curl -s http://localhost:4000/api >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Backend corriendo en puerto 4000
) else (
    echo [ERROR] Backend NO esta corriendo en puerto 4000
    echo    Verifica el backend y ejecutalo
)

echo.
echo ========================================
echo Pasos siguientes:
echo ========================================
echo 1. Abre http://localhost:3001/login en tu navegador
echo 2. Haz clic en 'Continuar con Google'
echo 3. Autentica con tu cuenta de Google
echo 4. Deberias ser redirigido a http://localhost:3001/
echo 5. Verifica que el token este guardado:
echo    - Abre la consola del navegador (F12)
echo    - Escribe: localStorage.getItem('token')
echo    - Deberias ver tu JWT
echo.
echo ========================================
echo Si hay errores:
echo ========================================
echo - Revisa BACKEND_CONFIG_GOOGLE_OAUTH.md
echo - Verifica los logs del backend
echo - Verifica la consola del navegador
echo.
pause

