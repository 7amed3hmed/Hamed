import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Trophy, Star, User, Medal, Award, ArrowRight } from 'lucide-react';
import { volunteerService } from '@/services/api';
import { getImageUrl } from '@/utils/imageUrl';
import { toast } from 'sonner';

interface VolunteerRank {
  _id: string;
  id?: string;
  totalHours: number;
  opportunitiesCount: number;
  username: string;
  profileImage?: string;
  rank?: number;
}

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
  return <User className={className || "h-10 w-10 text-muted-foreground"} />;
}

export default function TopRankVolunteerPage() {
  const [volunteers, setVolunteers] = useState<VolunteerRank[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    volunteerService.getLeaderboard()
      .then(res => {
        setVolunteers(res.data || []);
      })
      .catch(err => {
        toast.error('Failed to load leaderboard');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  const top3 = volunteers.slice(0, 3);
  const others = volunteers.slice(3);

  const getBadgeInfo = (index: number) => {
    switch (index) {
      case 0: return { label: 'Platinum', color: 'from-slate-200 to-slate-400', text: 'text-slate-800', icon: <Medal className="h-5 w-5 text-slate-600" /> };
      case 1: return { label: 'Gold', color: 'from-amber-300 to-amber-500', text: 'text-amber-900', icon: <Trophy className="h-5 w-5 text-amber-600" /> };
      case 2: return { label: 'Bronze', color: 'from-orange-400 to-orange-600', text: 'text-orange-900', icon: <Award className="h-5 w-5 text-orange-700" /> };
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden font-sans">
      <Navbar />

      <section
        className="relative py-24 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #F5F3FF 0%, #EDE9FE 60%, #FAF5FF 100%)' }}
      >
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-violet-300/20 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-amber-300/15 blur-[100px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 backdrop-blur-md border border-violet-200 text-sm font-semibold text-violet-700 shadow-sm">
              <Star className="h-4 w-4 text-violet-500 fill-violet-500" />
              Volunteer Recognition
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1]">
              Top Rank <span className="gradient-primary-text">Volunteers</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Celebrating the champions who dedicate their time and skills to make a real impact in our community.
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="h-12 w-12 rounded-full border-4 border-violet-600 border-t-transparent animate-spin" />
              <p className="text-muted-foreground font-medium">Calculating impact scores...</p>
            </div>
          ) : volunteers.length === 0 ? (
            <div className="max-w-md mx-auto bg-white rounded-3xl p-12 text-center border border-border shadow-sm">
              <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trophy className="h-8 w-8 text-violet-300" />
              </div>
              <h3 className="text-xl font-bold mb-2">No rankings yet</h3>
              <p className="text-muted-foreground mb-8">Be the first to join an opportunity and earn your place on the leaderboard!</p>
              <Link to="/internships">
                <Button className="gradient-primary rounded-full px-8">Browse Opportunities</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Top 3 Podium */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-end pb-8">
                {/* 2nd Place */}
                {top3[1] && (
                  <div
                    onClick={() => {
                      const volunteerId = top3[1]?.id || top3[1]?._id;
                      if (volunteerId) navigate(`/volunteers/${volunteerId}`);
                    }}
                    className="order-2 md:order-1 cursor-pointer group"
                  >
                    <div className="relative bg-white dark:bg-card rounded-3xl p-8 border border-border shadow-md hover:shadow-xl hover:-translate-y-2 transition-all duration-300 text-center flex flex-col items-center">
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-amber-400 text-amber-950 text-xs font-bold rounded-full shadow-lg">2ND PLACE</div>
                      <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-amber-300 to-amber-500 mb-6 shadow-lg shadow-amber-200/50">
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                          <VolunteerAvatar src={top3[1].profileImage} username={top3[1].username} className="h-10 w-10 text-muted-foreground" />
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-1 truncate w-full">{top3[1].username}</h3>
                      <div className="flex items-center gap-1.5 text-amber-600 font-bold mb-4">
                        <Trophy className="h-4 w-4" /> Gold Badge
                      </div>
                      <div className="grid grid-cols-2 w-full gap-2 border-t pt-4">
                        <div className="text-center">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Hours</p>
                          <p className="text-lg font-extrabold">{top3[1].totalHours}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Apps</p>
                          <p className="text-lg font-extrabold">{top3[1].opportunitiesCount}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 1st Place */}
                {top3[0] && (
                  <div
                    onClick={() => {
                      const volunteerId = top3[0]?.id || top3[0]?._id;
                      if (volunteerId) navigate(`/volunteers/${volunteerId}`);
                    }}
                    className="order-1 md:order-2 cursor-pointer group"
                  >
                    <div className="relative bg-white dark:bg-card rounded-[2.5rem] p-10 border-2 border-violet-200 shadow-2xl hover:shadow-violet-200/50 hover:-translate-y-3 transition-all duration-500 text-center flex flex-col items-center scale-110 z-10">
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-1.5 bg-violet-600 text-white text-sm font-black rounded-full shadow-xl animate-bounce">1ST PLACE</div>
                      <div className="w-32 h-32 rounded-full p-1.5 bg-gradient-to-tr from-slate-200 via-violet-500 to-slate-400 mb-6 shadow-2xl shadow-violet-200">
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                          <VolunteerAvatar src={top3[0].profileImage} username={top3[0].username} className="h-14 w-14 text-muted-foreground" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-black mb-1 truncate w-full text-violet-900">{top3[0].username}</h3>
                      <div className="flex items-center gap-1.5 text-slate-500 font-bold mb-6">
                        <Medal className="h-5 w-5 text-slate-400" /> Platinum Badge
                      </div>
                      <div className="grid grid-cols-2 w-full gap-4 border-t border-violet-100 pt-6">
                        <div className="text-center">
                          <p className="text-xs uppercase tracking-widest text-violet-400 font-black">Total Hours</p>
                          <p className="text-3xl font-black text-violet-600">{top3[0].totalHours}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs uppercase tracking-widest text-violet-400 font-black">Impacts</p>
                          <p className="text-3xl font-black text-violet-600">{top3[0].opportunitiesCount}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {top3[2] && (
                  <div
                    onClick={() => {
                      const volunteerId = top3[2]?.id || top3[2]?._id;
                      if (volunteerId) navigate(`/volunteers/${volunteerId}`);
                    }}
                    className="order-3 cursor-pointer group"
                  >
                    <div className="relative bg-white dark:bg-card rounded-3xl p-8 border border-border shadow-md hover:shadow-xl hover:-translate-y-2 transition-all duration-300 text-center flex flex-col items-center">
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-orange-500 text-white text-xs font-bold rounded-full shadow-lg">3RD PLACE</div>
                      <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-orange-400 to-orange-600 mb-6 shadow-lg shadow-orange-200/50">
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                          <VolunteerAvatar src={top3[2].profileImage} username={top3[2].username} className="h-10 w-10 text-muted-foreground" />
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-1 truncate w-full">{top3[2].username}</h3>
                      <div className="flex items-center gap-1.5 text-orange-600 font-bold mb-4">
                        <Award className="h-4 w-4" /> Bronze Badge
                      </div>
                      <div className="grid grid-cols-2 w-full gap-2 border-t pt-4">
                        <div className="text-center">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Hours</p>
                          <p className="text-lg font-extrabold">{top3[2].totalHours}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Apps</p>
                          <p className="text-lg font-extrabold">{top3[2].opportunitiesCount}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* The Rest of the Leaderboard */}
              {others.length > 0 && (
                <div className="max-w-4xl mx-auto space-y-3 pt-8 animate-slide-up">
                  <div className="flex items-center px-8 py-2 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                    <span className="w-16">Rank</span>
                    <span className="flex-1">Volunteer</span>
                    <span className="w-32 text-center">Impacts</span>
                    <span className="w-32 text-right">Total Hours</span>
                  </div>
                  {others.map((v, i) => (
                    <div
                      key={v.id || v._id}
                      onClick={() => {
                        const volunteerId = v.id || v._id;
                        if (volunteerId) navigate(`/volunteers/${volunteerId}`);
                      }}
                      className="group flex items-center px-8 py-5 bg-white dark:bg-card border border-border/50 rounded-2xl hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100/50 hover:-translate-x-1 transition-all duration-200 cursor-pointer"
                    >
                      <span className="w-16 font-black text-violet-300 text-xl group-hover:text-violet-500 transition-colors">#{i + 4}</span>
                      <div className="flex-1 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full border border-border overflow-hidden bg-muted flex items-center justify-center shrink-0">
                          <VolunteerAvatar src={v.profileImage} username={v.username} className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <span className="font-bold text-foreground group-hover:text-violet-700 transition-colors">{v.username}</span>
                      </div>
                      <div className="w-32 text-center">
                        <span className="px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-sm font-bold border border-violet-100">{v.opportunitiesCount} apps</span>
                      </div>
                      <div className="w-32 text-right">
                        <span className="text-xl font-black text-foreground">{v.totalHours}</span>
                        <span className="ml-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">hrs</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-24 text-center py-16 bg-white/40 backdrop-blur-sm rounded-[3rem] border border-white/60 max-w-4xl mx-auto shadow-sm">
            <h2 className="text-3xl font-black mb-4">Ready to climb the ranks?</h2>
            <p className="text-muted-foreground mb-10 max-w-md mx-auto">Join the mission today. Every hour you contribute helps a great cause and improves your global ranking.</p>
            <Link to="/internships">
              <Button size="lg" className="h-16 px-12 rounded-full gradient-primary text-white font-black text-lg shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:-translate-y-1 active:scale-95 transition-all">
                Find Your Opportunity <ArrowRight className="ml-3 h-6 w-6" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
