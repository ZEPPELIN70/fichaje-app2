import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { Eye, EyeOff, UserPlus } from 'lucide-react';

export default function Registro() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [formData, setFormData] = useState({
    contacto: '',
    username: '',
    nombreCompleto: '',
    pin: ''
  });

  useEffect(() => {
    checkIfRegistered();
  }, []);

  const checkIfRegistered = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const user = await base44.auth.me();
        if (user.pin) {
          window.location.href = createPageUrl('Dashboard');
        }
      }
    } catch {
      // Not authenticated, stay on registration
    }
  };

  const handleChange = (field, value) => {
    if (field === 'pin') {
      value = value.replace(/\D/g, '').slice(0, 4);
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.contacto) {
      toast.error('Introduce tu correo o teléfono');
      return;
    }
    if (!formData.username) {
      toast.error('Introduce tu nombre de usuario');
      return;
    }
    if (!formData.nombreCompleto) {
      toast.error('Introduce tu nombre y apellido');
      return;
    }
    if (formData.pin.length !== 4) {
      toast.error('El código debe tener 4 dígitos');
      return;
    }

    setIsLoading(true);
    try {
      const isAuth = await base44.auth.isAuthenticated();
      
      if (!isAuth) {
        // Redirect to login first, then come back
        toast.info('Primero debes crear una cuenta');
        base44.auth.redirectToLogin(createPageUrl('Registro'));
        return;
      }

      // Save user data
      await base44.auth.updateMe({
        full_name: formData.nombreCompleto,
        username: formData.username,
        contacto: formData.contacto,
        pin: formData.pin
      });

      toast.success('¡Registro completado!');
      window.location.href = createPageUrl('Dashboard');
    } catch (error) {
      toast.error('Error al registrar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-4 text-center">
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6988935c90672a3f2a52d3d6/b257d2600_LOGO2AGE.jpeg" 
          alt="AGE Logo" 
          className="w-20 h-20 object-cover rounded-full mx-auto mb-2 shadow-2xl"
        />
        <h1 className="text-2xl font-bold text-white">AGE</h1>
      </div>

      {/* Registration Form */}
      <Card className="w-full max-w-sm bg-slate-800/50 border-slate-700 backdrop-blur-xl">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="text-emerald-400" size={20} />
            <h2 className="text-lg font-bold text-white">Registrarse</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-slate-300 text-sm">Correo o Teléfono</Label>
              <Input
                value={formData.contacto}
                onChange={(e) => handleChange('contacto', e.target.value)}
                placeholder="correo@ejemplo.com o 612345678"
                className="bg-slate-900/50 border-slate-600 text-white h-10"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-slate-300 text-sm">Nombre de Usuario</Label>
              <Input
                value={formData.username}
                onChange={(e) => handleChange('username', e.target.value)}
                placeholder="@usuario"
                className="bg-slate-900/50 border-slate-600 text-white h-10"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-slate-300 text-sm">Nombre y Primer Apellido</Label>
              <Input
                value={formData.nombreCompleto}
                onChange={(e) => handleChange('nombreCompleto', e.target.value)}
                placeholder="Juan García"
                className="bg-slate-900/50 border-slate-600 text-white h-10"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-slate-300 text-sm">Código de 4 dígitos</Label>
              <div className="relative">
                <Input
                  type={showPin ? 'text' : 'password'}
                  value={formData.pin}
                  onChange={(e) => handleChange('pin', e.target.value)}
                  placeholder="••••"
                  className="bg-slate-900/50 border-slate-600 text-white text-center text-xl tracking-[0.5em] h-11"
                  maxLength={4}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button 
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold mt-4"
            >
              {isLoading ? 'Registrando...' : 'REGISTRARSE'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-4 text-slate-500 text-xs">
        © 2024 AGE
      </p>
    </div>
  );
}
