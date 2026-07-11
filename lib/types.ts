export type AppRole = 'platform_admin' | 'master' | 'manager' | 'trainer' | 'student';

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  role: AppRole;
  organization_id: string | null;
  avatar_url: string | null;
  must_change_password: boolean;
  status: string;
};

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  roles: AppRole[];
};
