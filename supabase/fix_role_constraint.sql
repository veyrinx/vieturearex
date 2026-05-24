-- ============================================================
-- FIX: Role Constraint Violation
-- Identifies and fixes rows with invalid role values
-- ============================================================

-- Step 1: Check what invalid role values exist
SELECT DISTINCT role FROM public.users 
WHERE role NOT IN ('super_admin', 'admin', 'it', 'manager', 'support', 'user');

-- Step 2: Temporarily drop the constraint to fix the data
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 3: Update any invalid roles to 'user' (default)
-- Adjust this based on what invalid values you find above
UPDATE public.users 
SET role = 'user' 
WHERE role NOT IN ('super_admin', 'admin', 'it', 'manager', 'support', 'user');

-- Step 4: Re-add the constraint
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('super_admin', 'admin', 'it', 'manager', 'support', 'user'));

-- Verify all roles are now valid
SELECT DISTINCT role FROM public.users ORDER BY role;
