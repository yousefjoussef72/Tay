import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

export default function PhysicsLabPage() {
  return (
    <main className="physics-lab-page" dir="rtl">
      <div className="physics-lab-toolbar">
        <Link to="/" className="physics-lab-back">
          <ArrowLeft size={16} />
          <span>العودة إلى Tay Space</span>
        </Link>
        <div className="physics-lab-heading">
          <span>المعمل العلمي التفاعلي</span>
          <h1>الحركة التوافقية البسيطة</h1>
        </div>
        <a className="physics-lab-open" href="/physics-lab/" target="_blank" rel="noopener noreferrer">
          <span>فتح المعمل منفصلًا</span>
          <ExternalLink size={15} />
        </a>
      </div>
      <iframe
        className="physics-lab-frame"
        src="/physics-lab/"
        title="معمل الحركة التوافقية البسيطة"
        loading="eager"
        referrerPolicy="same-origin"
        allow="fullscreen"
        allowFullScreen
      />
    </main>
  );
}
