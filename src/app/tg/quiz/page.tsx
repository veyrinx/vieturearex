"use client";

import { useState } from "react";
import { CheckCircle, XCircle, RotateCcw, Trophy } from "lucide-react";

const QUESTIONS = [
  {
    q: "Chế độ nào trong Free Fire cho phép 50 người chơi trên một bản đồ nhỏ hơn?",
    opts: ["Clash Squad", "Battle Royale", "Lone Wolf", "CS Ranked"],
    ans: 0,
  },
  {
    q: "Nhân vật nào có kỹ năng 'Thần Kinh Thép' giúp giảm sát thương khi bị tấn công?",
    opts: ["Alok", "Chrono", "Kla", "Hayato"],
    ans: 3,
  },
  {
    q: "Vật phẩm nào giúp người chơi hồi phục máu theo thời gian?",
    opts: ["Mushroom", "Medkit", "Adhesive", "Bandage"],
    ans: 2,
  },
  {
    q: "Bao nhiêu điểm để leo từ Đồng lên Bạc trong Free Fire?",
    opts: ["500 điểm", "1000 điểm", "1500 điểm", "2000 điểm"],
    ans: 0,
  },
  {
    q: "Chế độ 'Bermuda' là tên của loại gì trong Free Fire?",
    opts: ["Nhân vật", "Bản đồ", "Vũ khí", "Xe cộ"],
    ans: 1,
  },
  {
    q: "Kỹ năng active của nhân vật DJ Alok là gì?",
    opts: ["Tàng hình 3 giây", "Tạo vùng hồi máu và tăng tốc", "Gây điếc đối thủ", "Khiên năng lượng"],
    ans: 1,
  },
  {
    q: "Súng SCAR trong Free Fire thuộc loại nào?",
    opts: ["Sniper", "Shotgun", "Assault Rifle", "SMG"],
    ans: 2,
  },
  {
    q: "Trong Clash Squad, mỗi round tối đa bao nhiêu giây?",
    opts: ["60 giây", "90 giây", "120 giây", "180 giây"],
    ans: 1,
  },
  {
    q: "Rank cao nhất trong Free Fire Ranked mode là gì?",
    opts: ["Heroic", "Grandmaster", "Master", "Supreme"],
    ans: 1,
  },
  {
    q: "Khi nào thì 'Safe Zone' bắt đầu thu hẹp trong Battle Royale?",
    opts: ["Ngay từ đầu", "Sau 1 phút", "Khi còn 40 người", "Theo timer hiển thị trên màn hình"],
    ans: 3,
  },
];

export default function TgQuizPage() {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = QUESTIONS[current];
  const answered = selected !== null;

  function choose(idx: number) {
    if (answered) return;
    setSelected(idx);
    if (idx === q.ans) setScore((s) => s + 1);
  }

  function next() {
    if (current + 1 >= QUESTIONS.length) {
      setDone(true);
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
    }
  }

  function restart() {
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setDone(false);
  }

  const percent = Math.round((score / QUESTIONS.length) * 100);
  const grade =
    percent === 100 ? "Hoàn hảo! 🔥" :
    percent >= 80 ? "Xuất sắc! 🏆" :
    percent >= 60 ? "Khá tốt! 👍" :
    percent >= 40 ? "Cần luyện thêm 📚" : "Thử lại nhé! 💪";

  if (done) {
    return (
      <div className="flex flex-col items-center gap-6 p-6 pb-24">
        <Trophy size={56} style={{ color: "var(--tg-theme-button-color,#f97316)" }} />
        <div className="text-center space-y-1">
          <p className="font-bold text-2xl">{score}/{QUESTIONS.length}</p>
          <p className="font-semibold text-lg">{grade}</p>
          <p style={{ color: "var(--tg-theme-hint-color,#888)" }} className="text-sm">
            Độ chính xác: {percent}%
          </p>
        </div>
        <div
          className="w-full rounded-2xl p-4 space-y-2"
          style={{ backgroundColor: "var(--tg-theme-secondary-bg-color,#111)" }}
        >
          {QUESTIONS.map((q, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="text-xs mt-0.5" style={{ color: "var(--tg-theme-hint-color,#888)" }}>
                {i + 1}.
              </span>
              <span className="flex-1 text-xs" style={{ color: "var(--tg-theme-hint-color,#888)" }}>
                {q.opts[q.ans]}
              </span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={restart}
          className="flex items-center gap-2 rounded-xl px-6 py-3 font-semibold"
          style={{
            backgroundColor: "var(--tg-theme-button-color,#f97316)",
            color: "var(--tg-theme-button-text-color,#fff)",
          }}
        >
          <RotateCcw size={16} />
          Làm lại
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs" style={{ color: "var(--tg-theme-hint-color,#888)" }}>
        <span>Câu {current + 1}/{QUESTIONS.length}</span>
        <span>{score} điểm</span>
      </div>
      <div className="w-full rounded-full h-1.5" style={{ backgroundColor: "var(--tg-theme-secondary-bg-color,#222)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${((current) / QUESTIONS.length) * 100}%`,
            backgroundColor: "var(--tg-theme-button-color,#f97316)",
          }}
        />
      </div>

      {/* Question */}
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: "var(--tg-theme-secondary-bg-color,#111)" }}
      >
        <p className="font-semibold text-sm leading-relaxed">{q.q}</p>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {q.opts.map((opt, i) => {
          const isCorrect = i === q.ans;
          const isSelected = i === selected;
          let bg = "var(--tg-theme-secondary-bg-color,#111)";
          let color = "inherit";
          if (answered) {
            if (isCorrect) { bg = "rgba(16,185,129,0.15)"; color = "#10b981"; }
            else if (isSelected) { bg = "rgba(239,68,68,0.15)"; color = "#ef4444"; }
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => choose(i)}
              disabled={answered}
              className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium transition-all disabled:cursor-default"
              style={{ backgroundColor: bg, color, border: answered && isCorrect ? "1px solid rgba(16,185,129,0.4)" : "1px solid transparent" }}
            >
              <span>{opt}</span>
              {answered && isCorrect && <CheckCircle size={16} color="#10b981" />}
              {answered && isSelected && !isCorrect && <XCircle size={16} color="#ef4444" />}
            </button>
          );
        })}
      </div>

      {/* Next button */}
      {answered && (
        <button
          type="button"
          onClick={next}
          className="w-full rounded-2xl py-3 font-semibold text-sm mt-2"
          style={{
            backgroundColor: "var(--tg-theme-button-color,#f97316)",
            color: "var(--tg-theme-button-text-color,#fff)",
          }}
        >
          {current + 1 >= QUESTIONS.length ? "Xem kết quả" : "Câu tiếp theo →"}
        </button>
      )}
    </div>
  );
}
