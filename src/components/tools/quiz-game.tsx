"use client";

import { useEffect, useState } from "react";
import { Brain, Check, X, RotateCcw, Trophy, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type QuizQuestion = { q: string; opts: string[]; ans: number };

export function QuizGame() {
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
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-12 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Đang tải câu hỏi…
      </div>
    );
  }
  if (questions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-sm text-muted-foreground">
        Chưa có câu hỏi nào. Quay lại sau nhé!
      </div>
    );
  }

  const q = questions[current];
  const answered = selected !== null;
  const percent = Math.round((score / questions.length) * 100);
  const grade =
    percent === 100 ? "Hoàn hảo! 🔥" :
    percent >= 80 ? "Xuất sắc! 🏆" :
    percent >= 60 ? "Khá tốt! 👍" :
    percent >= 40 ? "Cần luyện thêm 📚" : "Thử lại nhé! 💪";

  function choose(idx: number) {
    if (answered) return;
    setSelected(idx);
    if (idx === q.ans) setScore((s) => s + 1);
  }
  function next() {
    if (current + 1 >= questions!.length) setDone(true);
    else { setCurrent((c) => c + 1); setSelected(null); }
  }
  function restart() { setCurrent(0); setSelected(null); setScore(0); setDone(false); }

  if (done) {
    return (
      <div className="space-y-6 rounded-2xl border border-border bg-card p-6 text-center">
        <Trophy className="mx-auto size-14 text-primary" />
        <div>
          <p className="font-heading text-4xl font-black tabular-nums text-foreground">{score}/{questions.length}</p>
          <p className="mt-1 font-heading text-lg font-black text-primary">{grade}</p>
          <p className="text-sm text-muted-foreground">Độ chính xác: {percent}%</p>
        </div>
        <div className="space-y-1.5 rounded-xl bg-muted/40 p-4 text-left">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Đáp án đúng</p>
          {questions.map((qq, i) => (
            <p key={i} className="text-xs text-muted-foreground">
              <b className="text-foreground">{i + 1}.</b> {qq.opts[qq.ans]}
            </p>
          ))}
        </div>
        <button
          onClick={restart}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <RotateCcw className="size-4" /> Làm lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><Brain className="size-4 text-primary" /> Câu {current + 1}/{questions.length}</span>
        <span className="font-bold text-primary">{score} điểm</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(current / questions.length) * 100}%` }} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="font-semibold leading-relaxed text-foreground">{q.q}</p>
      </div>

      <div className="space-y-2">
        {q.opts.map((opt, i) => {
          const isCorrect = i === q.ans;
          const isSelected = i === selected;
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={answered}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border p-4 text-left text-sm font-medium transition-all disabled:cursor-default",
                !answered && "border-border bg-card hover:border-primary/40",
                answered && isCorrect && "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                answered && isSelected && !isCorrect && "border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400",
                answered && !isCorrect && !isSelected && "border-border opacity-60",
              )}
            >
              <span>{opt}</span>
              {answered && isCorrect && <Check className="size-4 shrink-0" />}
              {answered && isSelected && !isCorrect && <X className="size-4 shrink-0" />}
            </button>
          );
        })}
      </div>

      {answered && (
        <button
          onClick={next}
          className="h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {current + 1 >= questions.length ? "Xem kết quả" : "Câu tiếp theo →"}
        </button>
      )}
    </div>
  );
}
