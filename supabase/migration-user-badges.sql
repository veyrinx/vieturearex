

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS badges text[] NOT NULL DEFAULT '{}'::text[];

-- Lọc user theo nhãn (vd: trang /doi-tac, /nha-sang-tao)
CREATE INDEX IF NOT EXISTS users_badges_idx ON public.users USING gin (badges);

-- Chống rác: tối đa 8 nhãn, key chỉ gồm [a-z0-9_]
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_badges_valid;
ALTER TABLE public.users ADD CONSTRAINT users_badges_valid CHECK (
  array_length(badges, 1) IS NULL
  OR (
    array_length(badges, 1) <= 8
    AND array_to_string(badges, ',') ~ '^[a-z0-9_]+(,[a-z0-9_]+)*$'
  )
);
