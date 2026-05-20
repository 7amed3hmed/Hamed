import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Calendar, MapPin, Briefcase, Award, Medal, Trophy, Clock, ChevronRight, Star } from 'lucide-react';
import { volunteerService, API_BASE_URL } from '@/services/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getImageUrl } from '@/utils/imageUrl';



function VolunteerAvatar({ src, username, className }: { src?: string; username?: string; className?: string }) {
  const [error, setError] = useState(false);
  const imageUrl = getImageUrl(src);
  if (imageUrl && !error) {
    return (
      <img
        src={imageUrl}
        className="w-full h-full object-cover"
        alt={username || ''}
        onError={() => setError(true)}
      />
    );
  }
  return <User className={className || "h-16 w-16 text-muted-foreground/40"} />;
}

export default function VolunteerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const safeFormatDate = (dateVal: any, formatStr: string, fallback: string = 'N/A') => {
    if (!dateVal) return fallback;
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return fallback;
      return format(d, formatStr);
    } catch {
      return fallback;
    }
  };

  useEffect(() => {
    if (!id) return;
    volunteerService.getProfile(id)
      .then(res => {
        setData(res.data);
      })
      .catch(err => {
        toast.error('Failed to load volunteer profile');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex h-[60vh] flex-col items-center justify-center text-center px-4">
          <h2 className="text-2xl font-bold mb-2">Volunteer Not Found</h2>
          <p className="text-muted-foreground mb-6">This profile might be private or does not exist.</p>
          <Link to="/top-rank-volunteer">
            <Button variant="outline" className="rounded-full">Back to Leaderboard</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const { profile, applications, rank, totalHours, opportunitiesCount } = data;

  const getBadgeInfo = (r: number) => {
    if (r === 1) return { label: 'Platinum Rank', icon: <Medal className="h-5 w-5 text-slate-500" />, color: 'bg-slate-100 text-slate-800 border-slate-300' };
    if (r === 2) return { label: 'Gold Rank', icon: <Trophy className="h-5 w-5 text-amber-500" />, color: 'bg-amber-100 text-amber-800 border-amber-300' };
    if (r === 3) return { label: 'Bronze Rank', icon: <Award className="h-5 w-5 text-orange-500" />, color: 'bg-orange-100 text-orange-800 border-orange-300' };
    return { label: `Rank #${r}`, icon: <Medal className="h-5 w-5 text-violet-500" />, color: 'bg-violet-100 text-violet-800 border-violet-300' };
  };

  const badge = getBadgeInfo(rank);

  return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar />

      <main className="py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

          {/* Header Profile Section */}
          <div className="relative bg-white dark:bg-card border border-border/50 rounded-[2.5rem] p-8 md:p-12 shadow-sm overflow-hidden animate-fade-in">
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-100/30 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-50/40 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

            <div className="relative flex flex-col md:flex-row items-center md:items-start gap-10">
              <div className="relative">
                <div className="w-40 h-40 rounded-[2.5rem] p-1.5 bg-gradient-to-tr from-violet-200 via-violet-500 to-amber-200 shadow-xl overflow-hidden">
                  <div className="w-full h-full rounded-[2.2rem] bg-white flex items-center justify-center overflow-hidden">
                    <VolunteerAvatar src={profile.profileImage} username={profile.username} className="h-16 w-16 text-muted-foreground/40" />
                  </div>
                </div>
                {rank <= 3 && (
                  <div className="absolute -bottom-3 -right-3 w-12 h-12 rounded-2xl bg-white shadow-lg border border-border flex items-center justify-center animate-bounce">
                    {badge.icon}
                  </div>
                )}
              </div>

              <div className="flex-1 text-center md:text-left space-y-4">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <h1 className="text-4xl font-black tracking-tight text-foreground">{profile.username}</h1>
                  <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-black ${badge.color} w-fit mx-auto md:mx-0 shadow-sm`}>
                    {badge.icon} {badge.label}
                  </div>
                </div>

                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-muted-foreground font-medium">
                  {profile.gender && (
                    <span className="flex items-center gap-1.5"><User className="h-4 w-4" /> {profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)}</span>
                  )}
                  {profile.availability && (
                    <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {profile.availability.charAt(0).toUpperCase() + profile.availability.slice(1)}</span>
                  )}
                  {profile.createdAt && (
                    <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Joined {safeFormatDate(profile.createdAt, 'MMMM yyyy', 'Recently')}</span>
                  )}
                </div>

                <div className="pt-4 flex flex-wrap justify-center md:justify-start gap-2">
                  {(profile.interests || []).map((interest: string) => (
                    <Badge key={interest} variant="secondary" className="px-4 py-1 rounded-full font-bold bg-violet-50 text-violet-700 border-violet-100">{interest}</Badge>
                  ))}
                  {(profile.skills || []).map((skill: string) => (
                    <Badge key={skill} variant="outline" className="px-4 py-1 rounded-full font-bold border-violet-200 text-violet-800">{skill}</Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full md:w-auto shrink-0">
                <div className="bg-violet-600 rounded-3xl p-6 text-white text-center shadow-lg shadow-violet-200">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Total Hours</p>
                  <p className="text-3xl font-black">{totalHours}</p>
                </div>
                <div className="bg-white border-2 border-violet-100 rounded-3xl p-6 text-violet-900 text-center shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-violet-400 mb-1">Opportunities</p>
                  <p className="text-3xl font-black">{opportunitiesCount}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Stats & Skills */}
            <div className="space-y-8 animate-slide-up">
              <Card className="rounded-[2.5rem] border-border/50 shadow-sm overflow-hidden">
                <div className="bg-violet-50/50 px-8 py-6 border-b border-border/50">
                  <h3 className="text-lg font-black flex items-center gap-2">
                    <Star className="h-5 w-5 text-violet-500 fill-violet-500" /> Personality Profile
                  </h3>
                </div>
                <CardContent className="p-8 space-y-6">
                  {profile.personalityAssessment && profile.personalityAssessment.length > 0 ? (
                    // Group by category and average the scores
                    Object.entries(
                      profile.personalityAssessment.reduce((acc: any, curr: any) => {
                        if (!acc[curr.category]) acc[curr.category] = { sum: 0, count: 0 };
                        acc[curr.category].sum += curr.score;
                        acc[curr.category].count += 1;
                        return acc;
                      }, {} as Record<string, { sum: number; count: number }>)
                    ).map(([trait, data]: [string, any]) => {
                      const avg = data.sum / data.count;
                      const percentage = (avg / 5) * 100;
                      return (
                        <div key={trait} className="space-y-2">
                          <div className="flex justify-between text-sm font-black uppercase tracking-tight">
                            <span>{trait}</span>
                            <span className="text-violet-600">{Math.round(percentage)}%</span>
                          </div>
                          <div className="h-3 w-full bg-muted rounded-full overflow-hidden p-0.5">
                            <div className="h-full gradient-primary rounded-full" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No assessment data shared publicly.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-[2.5rem] border-border/50 shadow-sm overflow-hidden">
                <div className="bg-slate-50/50 px-8 py-6 border-b border-border/50">
                  <h3 className="text-lg font-black flex items-center gap-2">
                    <Medal className="h-5 w-5 text-slate-500" /> Soft Skills
                  </h3>
                </div>
                <CardContent className="p-8 space-y-6">
                  {profile.softSkillsAssessment && profile.softSkillsAssessment.length > 0 ? (
                    profile.softSkillsAssessment.map((skill: any) => {
                      const percentage = (skill.score / 5) * 100;
                      return (
                        <div key={skill.category} className="space-y-2">
                          <div className="flex justify-between text-sm font-black uppercase tracking-tight">
                            <span>{skill.category}</span>
                            <span className="text-slate-600">{skill.score}/5</span>
                          </div>
                          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
                            <div className="h-full bg-slate-400 rounded-full" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No soft skills data shared publicly.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right: Timeline of Experience */}
            <div className="lg:col-span-2 space-y-8 animate-slide-up" style={{ transitionDelay: '100ms' }}>
              <div className="flex items-center justify-between px-4">
                <h3 className="text-2xl font-black text-foreground flex items-center gap-2">
                  <Briefcase className="h-6 w-6 text-violet-500" /> Contribution History
                </h3>
                <span className="px-4 py-1 bg-violet-600 text-white text-xs font-black rounded-full shadow-lg shadow-violet-200">
                  {applications.length} VERIFIED IMPACTS
                </span>
              </div>

              <div className="space-y-4">
                {applications.length > 0 ? (
                  applications.map((app: any, idx: number) => (
                    <div key={app._id} className="relative flex gap-6 group">
                      {/* Vertical line connector */}
                      {idx !== applications.length - 1 && (
                        <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-violet-100 group-hover:bg-violet-300 transition-colors" />
                      )}

                      <div className="shrink-0 w-12 h-12 rounded-2xl bg-white border-2 border-violet-100 flex items-center justify-center text-violet-600 font-black z-10 group-hover:bg-violet-600 group-hover:text-white transition-all duration-300">
                        {idx + 1}
                      </div>

                      <div className="flex-1 bg-white dark:bg-card border border-border/50 rounded-3xl p-6 hover:border-violet-300 hover:shadow-xl hover:shadow-violet-100/30 transition-all duration-300">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-[10px] font-black text-violet-400 uppercase tracking-widest">
                              <Calendar className="h-3 w-3" /> {safeFormatDate(app.acceptedAt, 'MMM dd, yyyy', 'Completed')}
                            </div>
                            <h4 className="text-xl font-black text-foreground group-hover:text-violet-700 transition-colors">{app.internshipTitle}</h4>
                            <p className="text-muted-foreground font-bold flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {app.companyName}</p>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Earned</p>
                              <p className="text-xl font-black text-violet-600">{app.hoursEarned} hrs</p>
                            </div>
                            <Link to={`/internships/${app.internshipId}`}>
                              <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-violet-50 hover:text-violet-600 transition-all">
                                <ChevronRight className="h-5 w-5" />
                              </div>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-muted/30 rounded-3xl p-12 text-center border border-dashed border-border">
                    <p className="text-muted-foreground font-medium italic">No public contributions recorded yet.</p>
                  </div>
                )}
              </div>

              {/* Impact Footer */}
              <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-violet-300 animate-pulse-slow">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                    <Trophy className="h-10 w-10 text-white" />
                  </div>
                  <div className="flex-1 text-center md:text-left space-y-2">
                    <h4 className="text-2xl font-black">Lifetime Impact Hero</h4>
                    <p className="text-violet-100 font-medium leading-relaxed">
                      This volunteer has contributed <strong>{totalHours} hours</strong> of skilled labor to social projects. Their efforts are verified by organizations and the inPlace admin team.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
