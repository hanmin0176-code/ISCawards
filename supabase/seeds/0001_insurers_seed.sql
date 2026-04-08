insert into public.insurers (insurer_code, insurer_name)
values
  ('samsung_fire', '삼성화재'),
  ('meritz_fire', '메리츠화재'),
  ('db_fire', 'DB손해보험'),
  ('hyundai_fire', '현대해상')
on conflict (insurer_code) do update
set insurer_name = excluded.insurer_name,
    updated_at = timezone('utc', now());
