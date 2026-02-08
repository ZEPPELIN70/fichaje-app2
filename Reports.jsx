import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subWeeks, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, MessageCircle, Mail, Download, Clock, Zap, Calendar, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function Reports() {
  const [reportType, setReportType] = useState('week');
  const [selectedPeriod, setSelectedPeriod] = useState('current');

  const { data: allSessions = [], isLoading } = useQuery({
    queryKey: ['all-sessions-report'],
    queryFn: () => base44.entities.WorkSession.filter({ is_active: false }, '-date', 1000),
  });

  const getDateRange = () => {
    const now = new Date();
    let start, end;

    switch (reportType) {
      case 'week':
        if (selectedPeriod === 'current') {
          start = startOfWeek(now, { weekStartsOn: 1 });
          end = endOfWeek(now, { weekStartsOn: 1 });
        } else {
          const weeksAgo = parseInt(selectedPeriod);
          const targetDate = subWeeks(now, weeksAgo);
          start = startOfWeek(targetDate, { weekStartsOn: 1 });
          end = endOfWeek(targetDate, { weekStartsOn: 1 });
        }
        break;
      case 'month':
        if (selectedPeriod === 'current') {
          start = startOfMonth(now);
          end = endOfMonth(now);
        } else {
          const monthsAgo = parseInt(selectedPeriod);
          const targetDate = subMonths(now, monthsAgo);
          start = startOfMonth(targetDate);
          end = endOfMonth(targetDate);
        }
        break;
      case 'year':
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      default:
        start = now;
        end = now;
    }

    return { start, end };
  };

  const { start, end } = getDateRange();

  const filteredSessions = allSessions.filter(session => {
    const sessionDate = new Date(session.date);
    return sessionDate >= start && sessionDate <= end;
  });

  const totalRegular = filteredSessions.reduce((sum, s) => sum + (s.regular_hours || 0), 0);
  const totalExtra = filteredSessions.reduce((sum, s) => sum + (s.extra_hours || 0), 0);
  const totalHours = filteredSessions.reduce((sum, s) => sum + (s.total_hours || 0), 0);
  const workDays = new Set(filteredSessions.map(s => s.date)).size;

  const formatHours = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getPeriodTitle = () => {
    switch (reportType) {
      case 'week':
        return `Semana: ${format(start, 'd MMM', { locale: es })} - ${format(end, 'd MMM yyyy', { locale: es })}`;
      case 'month':
        return `Mes: ${format(start, 'MMMM yyyy', { locale: es })}`;
      case 'year':
        return `Año: ${format(start, 'yyyy')}`;
      default:
        return '';
    }
  };

  const generateReportText = () => {
    let report = `📊 INFORME ${reportType.toUpperCase()} - AGE\n`;
    report += `📅 ${getPeriodTitle()}\n\n`;
    report += `━━━━━━━━━━━━━━━━━━━━\n`;
    report += `📈 RESUMEN GENERAL\n`;
    report += `━━━━━━━━━━━━━━━━━━━━\n`;
    report += `• Días trabajados: ${workDays}\n`;
    report += `• Horas normales: ${formatHours(totalRegular)}\n`;
    report += `• Horas extras: ${formatHours(totalExtra)}\n`;
    report += `• TOTAL: ${formatHours(totalHours)}\n\n`;
    
    if (workDays > 0) {
      report += `📊 PROMEDIO DIARIO: ${formatHours(totalHours / workDays)}\n\n`;
    }

    // Group by date
    const byDate = filteredSessions.reduce((acc, s) => {
      if (!acc[s.date]) acc[s.date] = [];
      acc[s.date].push(s);
      return acc;
    }, {});

    report += `━━━━━━━━━━━━━━━━━━━━\n`;
    report += `📝 DETALLE POR DÍA\n`;
    report += `━━━━━━━━━━━━━━━━━━━━\n`;

    Object.entries(byDate)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .forEach(([date, sessions]) => {
        const dayTotal = sessions.reduce((sum, s) => sum + (s.total_hours || 0), 0);
        const dayExtra = sessions.reduce((sum, s) => sum + (s.extra_hours || 0), 0);
        
        report += `\n📅 ${format(new Date(date), "EEEE d 'de' MMMM", { locale: es })}\n`;
        report += `   Total: ${formatHours(dayTotal)}`;
        if (dayExtra > 0) report += ` (${formatHours(dayExtra)} extra)`;
        report += `\n`;
        
        sessions.forEach(session => {
          report += `   • ${session.start_time?.slice(0, 5)} - ${session.end_time?.slice(0, 5)}\n`;
          if (session.work_description) {
            report += `     "${session.work_description}"\n`;
          }
        });
      });

    report += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    report += `Generado por AGE - Control de Tiempo\n`;
    report += `${format(new Date(), "dd/MM/yyyy HH:mm")}\n`;

    return report;
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(generateReportText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Informe AGE - ${getPeriodTitle()}`);
    const body = encodeURIComponent(generateReportText());
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const getPeriodOptions = () => {
    switch (reportType) {
      case 'week':
        return [
          { value: 'current', label: 'Esta semana' },
          { value: '1', label: 'Semana pasada' },
          { value: '2', label: 'Hace 2 semanas' },
          { value: '3', label: 'Hace 3 semanas' },
          { value: '4', label: 'Hace 4 semanas' },
        ];
      case 'month':
        return [
          { value: 'current', label: 'Este mes' },
          { value: '1', label: 'Mes pasado' },
          { value: '2', label: 'Hace 2 meses' },
          { value: '3', label: 'Hace 3 meses' },
        ];
      case 'year':
        return [{ value: 'current', label: 'Este año' }];
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to={createPageUrl('Dashboard')}>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
            <ArrowLeft size={24} />
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-white">Informes</h1>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-sm text-slate-400 mb-2 block">Tipo de informe</label>
          <Select value={reportType} onValueChange={(v) => { setReportType(v); setSelectedPeriod('current'); }}>
            <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="week" className="text-white">Semanal</SelectItem>
              <SelectItem value="month" className="text-white">Mensual</SelectItem>
              <SelectItem value="year" className="text-white">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm text-slate-400 mb-2 block">Período</label>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {getPeriodOptions().map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-white">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-slate-400 py-12">Cargando...</div>
      ) : (
        <>
          {/* Period Title */}
          <Card className="bg-slate-800/50 border-slate-700 mb-6">
            <CardContent className="p-4 text-center">
              <p className="text-emerald-400 font-semibold capitalize">{getPeriodTitle()}</p>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <Clock className="text-emerald-400" size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Horas Normales</p>
                    <p className="text-xl font-bold text-white">{formatHours(totalRegular)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Zap className="text-amber-400" size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Horas Extras</p>
                    <p className="text-xl font-bold text-white">{formatHours(totalExtra)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Calendar className="text-blue-400" size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Días Trabajados</p>
                    <p className="text-xl font-bold text-white">{workDays}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <FileText className="text-purple-400" size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Total Horas</p>
                    <p className="text-xl font-bold text-white">{formatHours(totalHours)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Average */}
          {workDays > 0 && (
            <Card className="bg-gradient-to-r from-emerald-500/20 to-amber-500/20 border-slate-700 mb-6">
              <CardContent className="p-4 text-center">
                <p className="text-slate-400 text-sm">Promedio diario</p>
                <p className="text-3xl font-bold text-white">{formatHours(totalHours / workDays)}</p>
              </CardContent>
            </Card>
          )}

          {/* Share Buttons */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-400">Compartir informe</h3>
            <Button
              onClick={shareViaWhatsApp}
              className="w-full h-12 bg-green-600 hover:bg-green-700"
            >
              <MessageCircle className="mr-2" size={20} />
              Enviar por WhatsApp
            </Button>
            <Button
              onClick={shareViaEmail}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700"
            >
              <Mail className="mr-2" size={20} />
              Enviar por Email
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
