"use client";

import { useEffect, useState } from "react";
import { Mi } from "../_components/mi";
import type { QuizQuestion } from "@/lib/constants/quiz";

export default function TgQuizPage() {
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/quiz/questions")
      .then((r) => (r.ok ? r.json() : { questions: [] }))
      .then((d) => setQuestions(Array.isArray(d.questions) ? d.questions : []))
      .catch(() => setQuestions([]));
  }, []);

  if (questions === null) {
    return (
      <div className="flex items-center justify-center gap-2 p-10" style={{ color: "var(--tg-theme-hint-color,#888)" }}>
        <Mi name="progress_activity" size={20} className="animate-spin" /> Đang tải câu hỏi…
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <p className="p-10 text-center text-sm" style={{ color: "var(--tg-theme-hint-color,#888)" }}>
        Chưa có câu hỏi nào. Quay lại sau nhé!
      </p>
    );
  }

  const q = questions[current];
  const answered = selected !== null;

  function choose(idx: number) {
    if (answered || !q) return;
    setSelected(idx);
    if (idx === q.ans) setScore((s) => s + 1);
  }

  function next() {
    if (current + 1 >= questions!.length) {
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

  const percent = Math.round((score / questions.length) * 100);
  const grade =
    percent === 100 ? "Hoàn hảo! 🔥" :
    percent >= 80 ? "Xuất sắc! 🏆" :
    percent >= 60 ? "Khá tốt! 👍" :
    percent >= 40 ? "Cần luyện thêm 📚" : "Thử lại nhé! 💪";

  if (done) {
    return (
      <div className="flex flex-col items-center gap-6 p-6 pb-24">
        <Mi name="emoji_events" size={56} fill={1} color="var(--tg-theme-button-color,#f97316)" />
        <div className="text-center space-y-1">
          <p className="font-bold text-2xl">{score}/{questions.length}</p>
          <p className="font-semibold text-lg">{grade}</p>
          <p style={{ color: "var(--tg-theme-hint-color,#888)" }} className="text-sm">
            Độ chính xác: {percent}%
          </p>
        </div>
        <div className="w-full rounded-2xl p-4 space-y-2" style={{ backgroundColor: "var(--tg-theme-secondary-bg-color,#111)" }}>
          {questions.map((qq, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="text-xs mt-0.5" style={{ color: "var(--tg-theme-hint-color,#888)" }}>{i + 1}.</span>
              <span className="flex-1 text-xs" style={{ color: "var(--tg-theme-hint-color,#888)" }}>{qq.opts[qq.ans]}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={restart}
          className="flex items-center gap-2 rounded-xl px-6 py-3 font-semibold"
          style={{ backgroundColor: "var(--tg-theme-button-color,#f97316)", color: "var(--tg-theme-button-text-color,#fff)" }}
        >
          <Mi name="replay" size={16} /> Làm lại
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs" style={{ color: "var(--tg-theme-hint-color,#888)" }}>
        <span>Câu {current + 1}/{questions.length}</span>
        <span>{score} điểm</span>
      </div>
      <div className="w-full rounded-full h-1.5" style={{ backgroundColor: "var(--tg-theme-secondary-bg-color,#222)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${(current / questions.length) * 100}%`, backgroundColor: "var(--tg-theme-button-color,#f97316)" }}
        />
      </div>

      {/* Question */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--tg-theme-secondary-bg-color,#111)" }}>
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
              {answered && isCorrect && <Mi name="check_circle" size={16} fill={1} color="#10b981" />}
              {answered && isSelected && !isCorrect && <Mi name="cancel" size={16} fill={1} color="#ef4444" />}
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
          style={{ backgroundColor: "var(--tg-theme-button-color,#f97316)", color: "var(--tg-theme-button-text-color,#fff)" }}
        >
          {current + 1 >= questions.length ? "Xem kết quả" : "Câu tiếp theo →"}
        </button>
      )}
    </div>
  );
}
