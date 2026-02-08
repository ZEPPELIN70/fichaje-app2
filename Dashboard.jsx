import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, FileText, BarChart3, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import TimeCounter from '@/components/TimeCounter';
import ClockButton from '@/components/ClockButton';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [showDescription, setShowDescription] = useState(false);
  const [workDescription, setWorkDescription] = useState('');
  const [currentSession, setCurrentSession] = useState(null);
  const [elapsedTime, setElapsedTime] = useState({ regular: 0, extra: 0 });
  const timerRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch {
      window.location.href = createPageUrl('Login');
    }
  };

  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: todaySessions = [], isLoading } = useQuery({
    queryKey: ['sessions', today],
    queryFn: () => base44.entities.WorkSession.filter({ date: today }),
  });

  // Find active session
  useEffect(() => {
    const active = todaySessions.find(s => s.is_active);
    setCurrentSession(active || null);
  }, [todaySessions]);

  // Timer logic
  useEffect(() => {
    if (currentSession?.is_active && currentSession?.start_time) {
      const startTime = new Date(`${today}T${currentSession.start_time}`);
      
      const updateTimer = () => {
        const now = new Date();
        const diffMs = now - startTime;
        const totalHours = diffMs / (1000 * 60 * 60);
        
        // Add previous completed hours from today
        const completedHours = todaySessions
          .filter(s => !s.is_active && s.total_hours)
          .reduce((sum, s) => sum + s.total_hours, 0);
        
        const totalWithCompleted = totalHours + completedHours;
        
        const regular = Math.min(totalWithCompleted, 8);
        const extra = Math.max(totalWithCompleted - 8, 0);
        
        setElapsedTime({ regular, extra });
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else {
      // Calculate completed hours for today
      const completedHours = todaySessions
        .filter(s => !s.is_active && s.total_hours)
        .reduce((sum, s) => sum + s.total_hours, 0);
      
      const regular = Math.min(completedHours, 8);
      const extra = Math.max(completedHours - 8, 0);
      setElapsedTime({ regular, extra });
    }
  }, [currentSession, todaySessions, today]);

  const createSessionMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkSession.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('¡Entrada registrada!');
    },
  });

  const updateSessionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkSession.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('¡Salida registrada!');
    },
  });

  const handleClockToggle = async () => {
    if (!user) return;

    if (currentSession?.is_active) {
      // Clock out - show description dialog
      setShowDescription(true);
    } else {
      // Clock in
      const now = new Date();
      await createSessionMutation.mutateAsync({
        user_name: user.full_name || user.email,
        date: today,
        start_time: format(now, 'HH:mm:ss'),
        is_active: true,
        regular_hours: 0,
        extra_hours: 0,
        total_hours: 0,
      });
    }
  };

  const handleClockOut = async () => {
    if (!currentSession) return;

    const now = new Date();
    const startTime = new Date(`${today}T${currentSession.start_time}`);
    const diffMs = now - startTime;
    const totalHours = diffMs / (1000 * 60 * 60);

    // Calculate with previous sessions
    const previousHours = todaySessions
      .filter(s => !s.is_active && s.total_hours)
      .reduce((sum, s) => sum + s.total_hours, 0);

    const totalWithPrevious = totalHours + previousHours;
    const regularForThis = Math.min(Math.max(8 - previousHours, 0), totalHours);
    const extraForThis = Math.max(totalHours - regularForThis, 0);

    await updateSessionMutation.mutateAsync({
      id: currentSession.id,
      data: {
        end_time: format(now, 'HH:mm:ss'),
        is_active: false,
        total_hours: totalHours,
        regular_hours: regularForThis,
        extra_hours: extraForThis,
        work_description: workDescription,
      },
    });

    setShowDescription(false);
    setWorkDescription('');
  };

  const handleLogout = async () => {
    await base44.auth.logout(createPageUrl('Login'));
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-pulse text-white">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Hola, {user.full_name || 'Usuario'}</h1>
          <p className="text-slate-400 text-sm">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <LogOut size={20} />
        </Button>
      </div>

      {/* Logo */}
      <div className="flex justify-center mb-8">
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6988935c90672a3f2a52d3d6/b257d2600_LOGO2AGE.jpeg" 
          alt="AGE Logo" 
          className="w-24 h-24 object-cover rounded-full"
        />
      </div>

      {/* Clock Button */}
      <div className="flex justify-center mb-10">
        <ClockButton
          isActive={!!currentSession?.is_active}
          onToggle={handleClockToggle}
          isLoading={createSessionMutation.isPending || updateSessionMutation.isPending}
        />
      </div>

      {/* Time Counters */}
      <TimeCounter
        regularHours={elapsedTime.regular}
        extraHours={elapsedTime.extra}
        isActive={!!currentSession?.is_active}
      />

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 p-4">
        <div className="flex justify-around max-w-md mx-auto">
          <Link
            to={createPageUrl('DailyReport')}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <FileText size={24} />
            <span className="text-xs">Día</span>
          </Link>
          <Link
            to={createPageUrl('History')}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <Calendar size={24} />
            <span className="text-xs">Historial</span>
          </Link>
          <Link
            to={createPageUrl('Reports')}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <BarChart3 size={24} />
            <span className="text-xs">Informes</span>
          </Link>
        </div>
      </div>

      {/* Work Description Dialog */}
      <Dialog open={showDescription} onOpenChange={setShowDescription}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Describe el trabajo realizado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              placeholder="¿Qué tareas realizaste hoy?"
              className="bg-slate-900/50 border-slate-600 text-white min-h-[120px]"
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDescription(false)}
                className="flex-1 border-slate-600 text-slate-300"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleClockOut}
                className="flex-1 bg-red-500 hover:bg-red-600"
              >
                Registrar Salida
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
