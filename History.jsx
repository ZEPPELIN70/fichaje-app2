import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval, subWeeks, subMonths, subYears, addWeeks, addMonths, addYears } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function History() {
  const [view, setView] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: allSessions = [], isLoading } = useQuery({
    queryKey: ['all-sessions'],
    queryFn: () => base44.entities.WorkSession.filter({ is_active: false }, '-date', 500),
  });

  const getDateRange = () => {
    switch (view) {
      case 'week':
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 }),
        };
      case 'month':
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate),
        };
      case 'year':
        return {
          start: startOfYear(currentDate),
          end: endOfYear(currentDate),
        };
      default:
        return { start: new Date(), end: new Date() };
    }
  };

  const navigate = (direction) => {
    const modifier = direction === 'prev' ? -1 : 1;
    switch (view) {
      case 'week':
        setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
        break;
      case 'month':
        setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
        break;
      case 'year':
        setCurrentDate(direction === 'prev' ? subYears(currentDate, 1) : addYears(currentDate, 1));
        break;
    }
  };

  const { start, end } = getDateRange();

  const filteredSessions = allSessions.filter(session => {
    const sessionDate = new Date(session.date);
    return sessionDate >= start && sessionDate <= end;
  });

  const totalRegular = filteredSessions.reduce((sum, s) => sum + (s.regular_hours || 0), 0);
  const totalExtra = filteredSessions.reduce((sum, s) => sum + (s.extra_hours || 0), 0);
  const totalHours = filteredSessions.reduce((sum, s) => sum + (s.total_hours || 0), 0);

  const formatHours = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getTitle = () => {
    switch (view) {
      case 'week':
        return `${format(start, 'd MMM', { locale: es })} - ${format(end, 'd MMM yyyy', { locale: es })}`;
      case 'month':
        return format(currentDate, 'MMMM yyyy', { locale: es });
      case 'year':
        return format(currentDate, 'yyyy');
      default:
        return '';
    }
  };

  // Group sessions by date for display
  const sessionsByDate = filteredSessions.reduce((acc, session) => {
    const date = session.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(session);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to={createPageUrl('Dashboard')}>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
            <ArrowLeft size={24} />
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-white">Historial</h1>
      </div>

      {/* View Tabs */}
      <Tabs value={view} onValueChange={setView} className="mb-6">
        <TabsList className="w-full bg-slate-800/50 border border-slate-700">
          <TabsTrigger value="week" className="flex-1 data-[state=active]:bg-emerald-500">
            Semana
          </TabsTrigger>
          <TabsTrigger value="month" className="flex-1 data-[state=active]:bg-emerald-500">
            Mes
          </TabsTrigger>
          <TabsTrigger value="year" className="flex-1 data-[state=active]:bg-emerald-500">
            Año
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Date Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('prev')}
          className="text-slate-400 hover:text-white"
        >
          <ChevronLeft size={24} />
        </Button>
        <h2 className="text-lg font-semibold text-white capitalize">{getTitle()}</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('next')}
          className="text-slate-400 hover:text-white"
        >
          <ChevronRight size={24} />
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-slate-400 py-12">Cargando...</div>
      ) : (
        <>
          {/* Summary */}
          <Card className="bg-gradient-to-br from-emerald-500/20 to-amber-500/20 border-slate-700 mb-6">
            <CardContent className="p-6">
              <h3 className="text-slate-400 text-sm mb-4">Resumen del período</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <Clock className="mx-auto mb-2 text-emerald-400" size={24} />
                  <p className="text-xs text-slate-400">Normal</p>
                  <p className="text-xl font-bold text-white">{formatHours(totalRegular)}</p>
                </div>
                <div className="text-center">
                  <Zap className="mx-auto mb-2 text-amber-400" size={24} />
                  <p className="text-xs text-slate-400">Extra</p>
                  <p className="text-xl font-bold text-white">{formatHours(totalExtra)}</p>
                </div>
                <div className="text-center">
                  <div className="w-6 h-6 mx-auto mb-2 bg-gradient-to-br from-emerald-400 to-amber-400 rounded-full" />
                  <p className="text-xs text-slate-400">Total</p>
                  <p className="text-xl font-bold text-white">{formatHours(totalHours)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sessions List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Detalle por día</h3>
            
            {Object.keys(sessionsByDate).length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6 text-center text-slate-400">
                  No hay registros para este período
                </CardContent>
              </Card>
            ) : (
              Object.entries(sessionsByDate)
                .sort(([a], [b]) => new Date(b) - new Date(a))
                .map(([date, daySessions]) => {
                  const dayTotal = daySessions.reduce((sum, s) => sum + (s.total_hours || 0), 0);
                  const dayRegular = daySessions.reduce((sum, s) => sum + (s.regular_hours || 0), 0);
                  const dayExtra = daySessions.reduce((sum, s) => sum + (s.extra_hours || 0), 0);
                  
                  return (
                    <Card key={date} className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium">
                            {format(new Date(date), "EEEE, d 'de' MMMM", { locale: es })}
                          </span>
                          <span className="text-emerald-400 font-bold">
                            {formatHours(dayTotal)}
                          </span>
                        </div>
                        <div className="flex gap-4 text-sm">
                          <span className="text-slate-400">
                            Normal: <span className="text-emerald-400">{formatHours(dayRegular)}</span>
                          </span>
                          {dayExtra > 0 && (
                            <span className="text-slate-400">
                              Extra: <span className="text-amber-400">{formatHours(dayExtra)}</span>
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
            )}
          </div>
        </>
      )}
    </div>
  );
}
