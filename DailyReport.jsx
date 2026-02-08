import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Clock, Zap, FileText, Share2, MessageCircle, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function DailyReport() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions', selectedDate],
    queryFn: () => base44.entities.WorkSession.filter({ date: selectedDate }),
  });

  const completedSessions = sessions.filter(s => !s.is_active);
  
  const totalRegular = completedSessions.reduce((sum, s) => sum + (s.regular_hours || 0), 0);
  const totalExtra = completedSessions.reduce((sum, s) => sum + (s.extra_hours || 0), 0);
  const totalHours = completedSessions.reduce((sum, s) => sum + (s.total_hours || 0), 0);

  const formatHours = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const generateReportText = () => {
    const dateStr = format(new Date(selectedDate), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
    let report = `📊 INFORME DIARIO - AGE\n`;
    report += `📅 ${dateStr}\n\n`;
    report += `⏱️ RESUMEN:\n`;
    report += `• Horas normales: ${formatHours(totalRegular)}\n`;
    report += `• Horas extras: ${formatHours(totalExtra)}\n`;
    report += `• Total: ${formatHours(totalHours)}\n\n`;
    
    if (completedSessions.length > 0) {
      report += `📝 SESIONES:\n`;
      completedSessions.forEach((session, i) => {
        report += `\n${i + 1}. ${session.start_time?.slice(0,5)} - ${session.end_time?.slice(0,5)}\n`;
        if (session.work_description) {
          report += `   Trabajo: ${session.work_description}\n`;
        }
      });
    }
    
    return report;
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(generateReportText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareViaEmail = async () => {
    const subject = encodeURIComponent(`Informe AGE - ${format(new Date(selectedDate), 'dd/MM/yyyy')}`);
    const body = encodeURIComponent(generateReportText());
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to={createPageUrl('Dashboard')}>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
            <ArrowLeft size={24} />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Informe del Día</h1>
          <p className="text-slate-400 text-sm">
            {format(new Date(selectedDate), "EEEE, d 'de' MMMM", { locale: es })}
          </p>
        </div>
      </div>

      {/* Date Picker */}
      <div className="mb-6">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-white"
        />
      </div>

      {isLoading ? (
        <div className="text-center text-slate-400 py-12">Cargando...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4 text-center">
                <Clock className="mx-auto mb-2 text-emerald-400" size={24} />
                <p className="text-xs text-slate-400">Normal</p>
                <p className="text-lg font-bold text-white">{formatHours(totalRegular)}</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4 text-center">
                <Zap className="mx-auto mb-2 text-amber-400" size={24} />
                <p className="text-xs text-slate-400">Extra</p>
                <p className="text-lg font-bold text-white">{formatHours(totalExtra)}</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4 text-center">
                <FileText className="mx-auto mb-2 text-blue-400" size={24} />
                <p className="text-xs text-slate-400">Total</p>
                <p className="text-lg font-bold text-white">{formatHours(totalHours)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Sessions List */}
          <div className="space-y-4 mb-6">
            <h2 className="text-lg font-semibold text-white">Sesiones del día</h2>
            
            {completedSessions.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6 text-center text-slate-400">
                  No hay sesiones registradas para este día
                </CardContent>
              </Card>
            ) : (
              completedSessions.map((session, index) => (
                <Card key={session.id} className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-emerald-400 font-mono font-bold">
                        {session.start_time?.slice(0, 5)} - {session.end_time?.slice(0, 5)}
                      </span>
                      <span className="text-white font-semibold">
                        {formatHours(session.total_hours || 0)}
                      </span>
                    </div>
                    
                    <div className="flex gap-4 text-sm mb-3">
                      <span className="text-slate-400">
                        Normal: <span className="text-emerald-400">{formatHours(session.regular_hours || 0)}</span>
                      </span>
                      <span className="text-slate-400">
                        Extra: <span className="text-amber-400">{formatHours(session.extra_hours || 0)}</span>
                      </span>
                    </div>
                    
                    {session.work_description && (
                      <div className="bg-slate-900/50 rounded-lg p-3">
                        <p className="text-sm text-slate-300">{session.work_description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Share Buttons */}
          {completedSessions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <Share2 size={16} />
                Compartir informe
              </h3>
              <div className="flex gap-3">
                <Button
                  onClick={shareViaWhatsApp}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <MessageCircle className="mr-2" size={20} />
                  WhatsApp
                </Button>
                <Button
                  onClick={shareViaEmail}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Mail className="mr-2" size={20} />
                  Email
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
