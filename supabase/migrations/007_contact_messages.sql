-- Contact messages table — persists every form submission for admin review.

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name   text        NOT NULL,
  email       text        NOT NULL,
  message     text        NOT NULL,
  status      text        NOT NULL DEFAULT 'new'
                          CHECK (status IN ('new', 'read', 'replied', 'archived')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Only service-role (server-side) can read/update; anyone can insert.
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a contact message"
ON public.contact_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Admins (service role) can read everything — no client-side read policy needed.
