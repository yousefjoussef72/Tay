import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Activity, Gauge, Waves } from "lucide-react";

const DEFAULTS = {
  harmonic_spring: { mass: 0.2, stiffness: 80, amplitude_cm: 8 },
  simple_pendulum: { length: 0.8, mass: 0.3, max_angle_deg: 12 },
  wave_motion: { amplitude: 2, frequency: 1.5 },
  projectile_motion: { speed: 12, angle_deg: 45, height: 0 },
  free_fall: { height: 20 },
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
const fmt = (value, digits = 2) => Number.isFinite(value) ? Number(value.toFixed(digits)).toString() : "—";

function Metric({ label, value, unit }) {
  return <div className="sim-metric"><span>{label}</span><strong dir="ltr">{value} <small>{unit}</small></strong></div>;
}

function RangeControl({ label, value, min, max, step, unit, onChange }) {
  return (
    <label className="sim-control">
      <span><b>{label}</b><strong dir="ltr">{fmt(value, step < 1 ? 2 : 1)} {unit}</strong></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))} />
      <small dir="ltr"><span>{min}</span><span>{max}</span></small>
    </label>
  );
}

function SpringSimulation({ config }) {
  const defaults = DEFAULTS.harmonic_spring;
  const [mass, setMass] = useState(clamp(config.mass ?? defaults.mass, 0.1, 2));
  const [stiffness, setStiffness] = useState(clamp(config.stiffness ?? defaults.stiffness, 10, 200));
  const [amplitude, setAmplitude] = useState(clamp(config.amplitude_cm ?? defaults.amplitude_cm, 2, 12));
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(false);
  const phaseRef = useRef(0);
  const omega = Math.sqrt(stiffness / mass);
  const period = (2 * Math.PI) / omega;
  const amp = amplitude / 100;
  const x = amp * Math.cos(phase);
  const velocity = -amp * omega * Math.sin(phase);
  const acceleration = -(omega ** 2) * x;
  const force = -stiffness * x;
  const totalEnergy = 0.5 * stiffness * amp * amp;
  const kineticEnergy = Math.max(0, totalEnergy - (0.5 * stiffness * x * x));
  const potentialEnergy = 0.5 * stiffness * x * x;
  const blockX = 365 + x * 690;
  const springPath = useMemo(() => {
    const start = 56;
    const end = blockX - 48;
    const length = Math.max(25, end - start);
    const turns = 13;
    let path = `M ${start} 145`;
    for (let index = 0; index < turns; index++) {
      const cx = start + length * (index + 0.5) / turns;
      const ex = start + length * (index + 1) / turns;
      const direction = index % 2 === 0 ? -1 : 1;
      path += ` Q ${cx} ${145 + direction * 18} ${ex} 145`;
    }
    return path;
  }, [blockX]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (!playing) return undefined;
    let frame = 0;
    let previous = performance.now();
    const tick = now => {
      const dt = Math.min((now - previous) / 1000, 0.04);
      previous = now;
      const next = (phaseRef.current + omega * dt) % (Math.PI * 2);
      phaseRef.current = next;
      setPhase(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, omega]);

  const reset = () => { setPlaying(false); phaseRef.current = 0; setPhase(0); };
  const seek = value => { setPlaying(false); phaseRef.current = value; setPhase(value); };

  return (
    <section className="simulator-card" aria-label="محاكاة النابض والكتلة">
      <div className="simulator-card-head">
        <div><span className="simulator-kicker"><Activity size={14} /> محاكاة مباشرة</span><h3>النابض والكتلة</h3><p>تحكّم في خصائص النظام وشاهد الحركة وقيمها لحظيًا</p></div>
        <div className="simulator-actions">
          <button type="button" className="sim-primary" onClick={() => setPlaying(value => !value)}>{playing ? <Pause size={15} /> : <Play size={15} />}{playing ? "إيقاف" : "تشغيل"}</button>
          <button type="button" className="sim-secondary" onClick={reset}><RotateCcw size={15} /> إعادة</button>
        </div>
      </div>
      <div className="simulator-layout">
        <div className="sim-stage">
          <div className="sim-stage-label"><span className="sim-live-dot" /> حركة الجسم خلال الدورة</div>
          <svg viewBox="0 0 720 270" role="img" aria-label="رسم توضيحي متحرك لنابض متصل بكتلة">
            <defs>
              <linearGradient id="simBlock" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#4ec6b2"/><stop offset="100%" stopColor="#08766f"/></linearGradient>
              <filter id="simShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="7" stdDeviation="5" floodColor="#071e24" floodOpacity=".22"/></filter>
            </defs>
            <rect x="0" y="0" width="720" height="270" rx="17" fill="#0d202b"/>
            <g stroke="#21404e" opacity=".7">{Array.from({length:14},(_,i)=><line key={i} x1={i*55} y1="20" x2={i*55} y2="244"/>)}<line x1="25" y1="145" x2="695" y2="145" strokeDasharray="4 8"/></g>
            <rect x="22" y="70" width="32" height="150" rx="5" fill="#607b86"/>
            <path d="M28 82h20 M28 101h20 M28 120h20 M28 139h20 M28 158h20 M28 177h20 M28 196h20" stroke="#b7cbd0" strokeWidth="4" />
            <line x1="365" y1="35" x2="365" y2="222" stroke="#50c8b3" strokeDasharray="6 7" strokeWidth="2"/>
            <rect x="304" y="18" width="122" height="25" rx="12" fill="#16443f"/><text x="365" y="35" fill="#a9f4e8" fontSize="12" textAnchor="middle">موضع الاتزان</text>
            <path d={springPath} stroke="#a7c2cb" strokeWidth="5" strokeLinecap="round" fill="none"/>
            <rect x={blockX-42} y="111" width="84" height="68" rx="13" fill="url(#simBlock)" filter="url(#simShadow)"/>
            <rect x={blockX-31} y="120" width="62" height="7" rx="3" fill="#c5fff2" opacity=".45"/>
            <text x={blockX} y="153" fill="#ffffff" fontSize="21" fontWeight="700" textAnchor="middle">m</text>
            <line x1={blockX} y1="198" x2={365} y2="198" stroke="#e59a68" strokeWidth="2.5"/>
            <path d={x>=0 ? `M365 198 l9 -5 v10 z` : `M365 198 l-9 -5 v10 z`} fill="#e59a68"/>
            <text x={blockX} y="220" fill="#f2bd95" fontSize="12" textAnchor="middle">x = {fmt(x*100,1)} cm</text>
            <text x="34" y="252" fill="#78949f" fontSize="11">جدار ثابت</text>
            <text x="684" y="252" fill="#78949f" fontSize="11" textAnchor="end">اتجاه موجب →</text>
          </svg>
          <div className="sim-phase-control"><span>طور الحركة</span><input aria-label="طور الحركة" dir="ltr" type="range" min="0" max={Math.PI*2} step=".01" value={phase} onChange={event=>seek(Number(event.target.value))}/><strong dir="ltr">{Math.round(phase/(Math.PI*2)*100)}%</strong></div>
        </div>
        <div className="sim-controls">
          <RangeControl label="كتلة الجسم" value={mass} min={0.1} max={2} step={0.05} unit="kg" onChange={setMass}/>
          <RangeControl label="صلابة النابض" value={stiffness} min={10} max={200} step={1} unit="N/m" onChange={setStiffness}/>
          <RangeControl label="سعة الاهتزاز" value={amplitude} min={2} max={12} step={0.5} unit="cm" onChange={setAmplitude}/>
          <div className="sim-note"><strong>جرّب ولاحظ</strong><p>{mass>1.2?"زيادة الكتلة تجعل الاهتزاز أبطأ.":stiffness>140?"زيادة صلابة النابض تجعل الاهتزاز أسرع.":amplitude>10?"زيادة السعة ترفع الطاقة الكلية، لكن لا تغيّر الزمن الدوري في النموذج المثالي.":"غيّر قيمة واحدة كل مرة حتى تلاحظ أثرها بوضوح."}</p></div>
        </div>
      </div>
      <div className="sim-metrics-grid">
        <Metric label="الزمن الدوري" value={fmt(period,3)} unit="s"/>
        <Metric label="التردد" value={fmt(1/period,3)} unit="Hz"/>
        <Metric label="التردد الزاوي" value={fmt(omega,3)} unit="rad/s"/>
        <Metric label="الطاقة الكلية" value={fmt(totalEnergy,3)} unit="J"/>
        <Metric label="الإزاحة" value={fmt(x,3)} unit="m"/>
        <Metric label="السرعة" value={fmt(velocity,3)} unit="m/s"/>
        <Metric label="العجلة" value={fmt(acceleration,3)} unit="m/s²"/>
        <Metric label="قوة الإرجاع" value={fmt(force,3)} unit="N"/>
      </div>
      <div className="sim-energy">
        <div><span>طاقة الوضع المرونية</span><strong dir="ltr">{fmt(potentialEnergy,3)} J</strong><div><i style={{width:`${totalEnergy?potentialEnergy/totalEnergy*100:0}%`}}/></div></div>
        <div><span>طاقة الحركة</span><strong dir="ltr">{fmt(kineticEnergy,3)} J</strong><div><i style={{width:`${totalEnergy?kineticEnergy/totalEnergy*100:0}%`}}/></div></div>
      </div>
    </section>
  );
}

function PendulumSimulation({ config }) {
  const [length, setLength] = useState(clamp(config.length ?? 0.8, 0.35, 1.4));
  const [mass, setMass] = useState(clamp(config.mass ?? 0.3, 0.1, 1.5));
  const [maxAngle, setMaxAngle] = useState(clamp(config.max_angle_deg ?? 12, 3, 20));
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(false);
  const phaseRef = useRef(0);
  const omega = Math.sqrt(9.81 / length);
  const period = 2 * Math.PI / omega;
  const amplitude = maxAngle * Math.PI / 180;
  const theta = amplitude * Math.cos(phase);
  const angularVelocity = -amplitude * omega * Math.sin(phase);
  const velocity = length * angularVelocity;
  const x1 = 360 + Math.sin(theta) * 190 * length;
  const y1 = 45 + Math.cos(theta) * 190 * length;
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => {
    if (!playing) return undefined;
    let frame=0, previous=performance.now();
    const tick=now=>{
      const dt=Math.min((now-previous)/1000,.04); previous=now;
      const next=(phaseRef.current+omega*dt)%(Math.PI*2); phaseRef.current=next; setPhase(next);
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(frame);
  },[playing,omega]);
  const seek=value=>{setPlaying(false);phaseRef.current=value;setPhase(value);};
  return (
    <section className="simulator-card">
      <div className="simulator-card-head"><div><span className="simulator-kicker"><Activity size={14}/> محاكاة مباشرة</span><h3>البندول البسيط</h3><p>غيّر طول الخيط وكتلة الكرة وزاوية الإزاحة</p></div>
        <div className="simulator-actions"><button type="button" className="sim-primary" onClick={()=>setPlaying(v=>!v)}>{playing?<Pause size={15}/>:<Play size={15}/>} {playing?"إيقاف":"تشغيل"}</button><button type="button" className="sim-secondary" onClick={()=>{setPlaying(false);seek(0)}}><RotateCcw size={15}/> إعادة</button></div>
      </div>
      <div className="simulator-layout">
        <div className="sim-stage">
          <div className="sim-stage-label"><span className="sim-live-dot"/> موضع البندول</div>
          <svg viewBox="0 0 720 280" role="img" aria-label="رسم توضيحي للبندول البسيط">
            <rect width="720" height="280" rx="17" fill="#0d202b"/>
            <path d="M245 45H475L450 62H270Z" fill="#5c7883"/><path d="M360 45V28" stroke="#a8c6ce" strokeWidth="10" strokeLinecap="round"/>
            <line x1="360" y1="48" x2={x1} y2={y1} stroke="#c7d8dd" strokeWidth="4"/>
            <line x1="360" y1="48" x2="360" y2="245" stroke="#365764" strokeDasharray="6 7" strokeWidth="2"/>
            <path d={`M${360-110*Math.sin(amplitude)} 190 Q360 215 ${360+110*Math.sin(amplitude)} 190`} fill="none" stroke="#46717b" strokeDasharray="5 6" strokeWidth="2"/>
            <circle cx={x1} cy={y1} r={16+mass*7} fill="#e6a46f" stroke="#ffd5ad" strokeWidth="4"/>
            <circle cx={x1-5} cy={y1-5} r="4" fill="#fff0dc"/>
            <text x="360" y="265" fill="#8eabb5" fontSize="12" textAnchor="middle">موضع الاتزان</text>
          </svg>
          <div className="sim-phase-control"><span>طور الحركة</span><input aria-label="طور البندول" dir="ltr" type="range" min="0" max={Math.PI*2} step=".01" value={phase} onChange={e=>seek(Number(e.target.value))}/><strong dir="ltr">{Math.round(phase/(Math.PI*2)*100)}%</strong></div>
        </div>
        <div className="sim-controls">
          <RangeControl label="طول الخيط" value={length} min={0.35} max={1.4} step={0.05} unit="m" onChange={setLength}/>
          <RangeControl label="كتلة الكرة" value={mass} min={0.1} max={1.5} step={0.05} unit="kg" onChange={setMass}/>
          <RangeControl label="زاوية الإزاحة الابتدائية" value={maxAngle} min={3} max={20} step={1} unit="°" onChange={setMaxAngle}/>
          <div className="sim-note"><strong>جرّب ولاحظ</strong><p>{length>1.1?"زيادة طول الخيط تزيد الزمن الدوري.":mass>1.1?"تغيير الكتلة وحدها لا يغيّر الزمن الدوري.":"قانون الزمن الدوري هنا تقريب صالح للزوايا الصغيرة."}</p></div>
        </div>
      </div>
      <div className="sim-metrics-grid">
        <Metric label="الزمن الدوري" value={fmt(period,3)} unit="s"/>
        <Metric label="التردد" value={fmt(1/period,3)} unit="Hz"/>
        <Metric label="التردد الزاوي" value={fmt(omega,3)} unit="rad/s"/>
        <Metric label="الإزاحة الزاوية" value={fmt(theta*180/Math.PI,2)} unit="°"/>
        <Metric label="السرعة المماسية" value={fmt(velocity,3)} unit="m/s"/>
        <Metric label="طول الخيط" value={fmt(length,2)} unit="m"/>
      </div>
      <div className="sim-equation"><strong>قانون البندول البسيط للزوايا الصغيرة</strong><b dir="ltr">T = 2π√(L/g)　 ·　 ω = √(g/L)</b><p>g = 9.81 m/s². كتلة الكرة لا تظهر في قانون الزمن الدوري؛ لذلك تغييرها وحده لا يغير T.</p></div>
    </section>
  );
}

function WaveSimulation({ config }) {
  const [amplitude,setAmplitude]=useState(clamp(config.amplitude ?? 2,0.5,5));
  const [frequency,setFrequency]=useState(clamp(config.frequency ?? 1.5,0.2,5));
  const [phase,setPhase]=useState(0);
  const [playing,setPlaying]=useState(false);
  const phaseRef=useRef(0);
  useEffect(()=>{phaseRef.current=phase},[phase]);
  useEffect(()=>{
    if(!playing)return undefined;
    let frame=0,previous=performance.now();
    const tick=now=>{const dt=Math.min((now-previous)/1000,.04);previous=now;const next=(phaseRef.current+2*Math.PI*frequency*dt)%(2*Math.PI);phaseRef.current=next;setPhase(next);frame=requestAnimationFrame(tick)};
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[playing,frequency]);
  const points=Array.from({length:121},(_,i)=>{const x=35+i*5.4;const y=120-amplitude*17*Math.sin(i/120*2*Math.PI*2-phase);return `${i?"L":"M"}${x.toFixed(1)} ${y.toFixed(1)}`}).join(" ");
  return (
    <section className="simulator-card">
      <div className="simulator-card-head"><div><span className="simulator-kicker"><Waves size={14}/> محاكاة مباشرة</span><h3>الموجة الجيبية</h3><p>راقب أثر السعة والتردد في شكل الموجة</p></div><div className="simulator-actions"><button type="button" className="sim-primary" onClick={()=>setPlaying(v=>!v)}>{playing?<Pause size={15}/>:<Play size={15}/>} {playing?"إيقاف":"تشغيل"}</button><button type="button" className="sim-secondary" onClick={()=>{setPlaying(false);phaseRef.current=0;setPhase(0)}}><RotateCcw size={15}/> إعادة</button></div></div>
      <div className="sim-stage"><svg viewBox="0 0 720 240" role="img" aria-label="منحنى موجة جيبية"><rect width="720" height="240" rx="17" fill="#0d202b"/><g stroke="#294956" strokeDasharray="4 7"><line x1="35" y1="120" x2="685" y2="120"/><line x1="35" y1="35" x2="35" y2="205"/></g><path d={points} fill="none" stroke="#53cbb7" strokeWidth="4" strokeLinecap="round"/><text x="680" y="145" fill="#8eabb5" fontSize="12">x</text><text x="49" y="27" fill="#8eabb5" fontSize="12">y</text></svg></div>
      <div className="simulator-layout sim-wave-layout"><div className="sim-controls"><RangeControl label="السعة" value={amplitude} min={0.5} max={5} step={0.1} unit="cm" onChange={setAmplitude}/><RangeControl label="التردد" value={frequency} min={0.2} max={5} step={0.1} unit="Hz" onChange={setFrequency}/></div><div className="sim-metrics-grid"><Metric label="الزمن الدوري" value={fmt(1/frequency,3)} unit="s"/><Metric label="التردد الزاوي" value={fmt(2*Math.PI*frequency,3)} unit="rad/s"/></div></div>
    </section>
  );
}

function ProjectileSimulation({ config }) {
  const [speed,setSpeed]=useState(clamp(config.speed ?? 12,2,30));
  const [angle,setAngle]=useState(clamp(config.angle_deg ?? 45,10,80));
  const [height,setHeight]=useState(clamp(config.height ?? 0,0,20));
  const radians=angle*Math.PI/180;
  const vx=speed*Math.cos(radians);
  const vy=speed*Math.sin(radians);
  const g=9.81;
  const time=(vy+Math.sqrt(vy*vy+2*g*height))/g;
  const range=vx*time;
  const maxHeight=height+(vy*vy)/(2*g);
  const points=Array.from({length:81},(_,i)=>{const t=time*i/80;const x=35+(range?xScale(range)*vx*t:0);const y=198-(height+vy*t-.5*g*t*t)*yScale(maxHeight);return `${i?"L":"M"}${x.toFixed(2)} ${y.toFixed(2)}`}).join(" ");
  function xScale(r){return 620/Math.max(r,1)}
  function yScale(h){return 155/Math.max(h,1)}
  return (
    <section className="simulator-card">
      <div className="simulator-card-head"><div><span className="simulator-kicker"><Activity size={14}/> محاكاة مباشرة</span><h3>حركة المقذوفات</h3><p>غيّر السرعة الابتدائية وزاوية القذف وارتفاع البداية</p></div></div>
      <div className="sim-stage"><svg viewBox="0 0 720 240" role="img" aria-label="مسار حركة مقذوف في مجال الجاذبية"><rect width="720" height="240" rx="17" fill="#0d202b"/><line x1="30" y1="200" x2="690" y2="200" stroke="#49616a" strokeWidth="2"/><path d={points} fill="none" stroke="#5ad0b9" strokeWidth="4" strokeLinecap="round"/><circle cx="35" cy={198-height*yScale(maxHeight)} r="6" fill="#f0ae7e"/><text x="680" y="222" fill="#8eabb5" fontSize="11" textAnchor="end">المدى الأفقي</text></svg></div>
      <div className="simulator-layout sim-wave-layout"><div className="sim-controls"><RangeControl label="السرعة الابتدائية" value={speed} min={2} max={30} step={0.5} unit="m/s" onChange={setSpeed}/><RangeControl label="زاوية القذف" value={angle} min={10} max={80} step={1} unit="°" onChange={setAngle}/><RangeControl label="ارتفاع البداية" value={height} min={0} max={20} step={1} unit="m" onChange={setHeight}/></div><div className="sim-metrics-grid"><Metric label="زمن الطيران" value={fmt(time,2)} unit="s"/><Metric label="المدى الأفقي" value={fmt(range,2)} unit="m"/><Metric label="أقصى ارتفاع" value={fmt(maxHeight,2)} unit="m"/></div></div>
    </section>
  );
}

function FreeFallSimulation({ config }) {
  const [height,setHeight]=useState(clamp(config.height ?? 20,1,100));
  const [elapsed,setElapsed]=useState(0);
  const g=9.81;
  const fallTime=Math.sqrt(2*height/g);
  const t=clamp(elapsed,0,fallTime);
  const distance=0.5*g*t*t;
  const speed=g*t;
  const reset=()=>setElapsed(0);
  return (
    <section className="simulator-card">
      <div className="simulator-card-head"><div><span className="simulator-kicker"><Gauge size={14}/> نموذج حسابي تفاعلي</span><h3>السقوط الحر</h3><p>غيّر ارتفاع البداية ثم حرّك الزمن لملاحظة تغير الإزاحة والسرعة</p></div><button type="button" className="sim-secondary" onClick={reset}><RotateCcw size={15}/> إعادة</button></div>
      <div className="simulator-layout">
        <div className="sim-stage"><svg viewBox="0 0 720 260" role="img" aria-label="تمثيل موضع جسم في السقوط الحر"><rect width="720" height="260" rx="17" fill="#0d202b"/><line x1="360" y1="30" x2="360" y2="222" stroke="#49616a" strokeDasharray="5 7" strokeWidth="2"/><line x1="245" y1="222" x2="475" y2="222" stroke="#6f8a91" strokeWidth="5"/><circle cx="360" cy={40+distance/height*160} r="14" fill="#e8a36d" stroke="#ffd7b4" strokeWidth="3"/><text x="382" y="48" fill="#a7bac1" fontSize="12">البداية</text><text x="382" y="240" fill="#a7bac1" fontSize="12">الأرض</text></svg></div>
        <div className="sim-controls"><RangeControl label="ارتفاع البداية" value={height} min={1} max={100} step={1} unit="m" onChange={value=>{setHeight(value);setElapsed(0)}}/><RangeControl label="الزمن المنقضي" value={t} min={0} max={fallTime} step={0.01} unit="s" onChange={setElapsed}/></div>
      </div>
      <div className="sim-metrics-grid"><Metric label="زمن السقوط" value={fmt(fallTime,2)} unit="s"/><Metric label="المسافة المقطوعة" value={fmt(distance,2)} unit="m"/><Metric label="السرعة اللحظية" value={fmt(speed,2)} unit="m/s"/></div>
    </section>
  );
}

export default function ExperimentSimulator({ simulatorType, config = {} }) {
  const normalized = simulatorType || "harmonic_spring";
  if (normalized === "harmonic_spring") return <SpringSimulation config={config}/>;
  if (normalized === "simple_pendulum") return <PendulumSimulation config={config}/>;
  if (normalized === "wave_motion") return <WaveSimulation config={config}/>;
  if (normalized === "projectile_motion") return <ProjectileSimulation config={config}/>;
  if (normalized === "free_fall") return <FreeFallSimulation config={config}/>;
  return <div className="sim-unavailable">نوع المحاكاة غير مدعوم في هذا الإصدار.</div>;
}

export const SIMULATOR_OPTIONS = [
  { value:"auto", label:"دع الذكاء الاصطناعي يختار النموذج" },
  { value:"", label:"نشاط بدون محاكاة" },
  { value:"harmonic_spring", label:"النابض والكتلة" },
  { value:"simple_pendulum", label:"البندول البسيط" },
  { value:"wave_motion", label:"الموجة الجيبية" },
  { value:"projectile_motion", label:"حركة المقذوفات" },
  { value:"free_fall", label:"السقوط الحر" }
];
