import PocketBase from 'pocketbase';
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Types for our collections
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'consultant' | 'client';
  avatar?: string;
  created: string;
  updated: string;
}

export interface Client {
  id: string;
  name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  contract_value?: number;
  status: 'active' | 'inactive' | 'prospective';
  notes?: string;
  user?: string;
  created: string;
  updated: string;
}

export interface Building {
  id: string;
  client: string;
  name: string;
  square_footage?: number;
  building_type?: 'academic' | 'administrative' | 'residential' | 'laboratory' | 'athletic' | 'library' | 'healthcare' | 'dining' | 'other';
  year_built?: number;
  address?: string;
  floors?: number;
  occupancy?: number;
  notes?: string;
  created: string;
  updated: string;
  expand?: {
    client?: Client;
  };
}

export interface Project {
  id: string;
  client: string;
  name: string;
  description?: string;
  status: 'planning' | 'approved' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  start_date?: string;
  end_date?: string;
  budget?: number;
  actual_cost?: number;
  expected_annual_savings?: number;
  actual_annual_savings?: number;
  roi_years?: number;
  buildings?: string[];
  assigned_to?: string[];
  created: string;
  updated: string;
}

export interface Audit {
  id: string;
  client: string;
  buildings?: string[];
  audit_date: string;
  auditor: string;
  audit_type: 'walkthrough' | 'investment_grade' | 'retro_commissioning' | 'benchmarking' | 'other';
  findings_summary?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'report_delivered';
  created: string;
  updated: string;
}

export interface EnergyData {
  id: string;
  building: string;
  timestamp: string;
  usage_kwh?: number;
  cost?: number;
  fuel_type: 'electricity' | 'natural_gas' | 'fuel_oil' | 'steam' | 'chilled_water' | 'propane' | 'other';
  meter_id?: string;
  reading_type?: 'actual' | 'estimated' | 'calculated';
  demand_kw?: number;
  created: string;
  updated: string;
}

export interface Recommendation {
  id: string;
  audit?: string;
  project?: string;
  building: string;
  title: string;
  description?: string;
  category?: 'hvac' | 'lighting' | 'envelope' | 'controls' | 'renewable' | 'behavioral' | 'other';
  estimated_cost?: number;
  estimated_annual_savings?: number;
  roi_years?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'proposed' | 'approved' | 'in_progress' | 'implemented' | 'rejected';
  created: string;
  updated: string;
}

export interface Equipment {
  id: string;
  building: string;
  name: string;
  equipment_type: 'boiler' | 'chiller' | 'air_handler' | 'heat_pump' | 'lighting_fixture' | 'controls_system' | 'pump' | 'fan' | 'other';
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  install_date?: string;
  age_years?: number;
  efficiency_rating?: string;
  capacity?: string;
  maintenance_schedule?: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  last_maintenance_date?: string;
  notes?: string;
  created: string;
  updated: string;
}

export interface Document {
  id: string;
  title: string;
  description?: string;
  file: string;
  client?: string;
  project?: string;
  audit?: string;
  building?: string;
  tags?: string;
  uploaded_by: string;
  created: string;
  updated: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assigned_to?: string;
  due_date?: string;
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  project?: string;
  created_by: string;
  created: string;
  updated: string;
}

export interface CustomView {
  id: string;
  name: string;
  description?: string;
  view_type: 'sql_query' | 'perspective_config';
  sql_query?: string;
  perspective_config?: Record<string, any>;
  created_by: string;
  is_public?: boolean;
  category?: 'energy_analysis' | 'financial' | 'project_tracking' | 'building_performance' | 'other';
  created: string;
  updated: string;
}

// Initialize PocketBase
const PB_URL = browser ? (import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090') : '';

export const pb = browser ? new PocketBase(PB_URL) : null;

// Store for current user
export const currentUser = writable<User | null>(browser && pb ? pb.authStore.model as unknown as User : null);

// Update store when auth changes
if (browser && pb) {
  pb.authStore.onChange((token, model) => {
    currentUser.set(model as unknown as User);
  });
}

// Auth helpers
export const auth = {
  async login(email: string, password: string) {
    if (!pb) return;
    const authData = await pb.collection('users').authWithPassword(email, password);
    currentUser.set(authData.record as unknown as User);
    return authData;
  },

  async logout() {
    if (!pb) return;
    pb.authStore.clear();
    currentUser.set(null);
  },

  async register(email: string, password: string, name: string, role: 'admin' | 'consultant' | 'client' = 'consultant') {
    if (!pb) return;
    const data = {
      email,
      password,
      passwordConfirm: password,
      name,
      role,
    };
    return await pb.collection('users').create(data);
  },

  isAuthenticated() {
    return pb?.authStore.isValid || false;
  },

  hasRole(role: string | string[]) {
    const user = pb?.authStore.model as unknown as User;
    if (!user) return false;
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    return user.role === role;
  },

  isAdmin() {
    return this.hasRole('admin');
  },
};

// Helper to get file URL
export function getFileUrl(record: any, filename: string, thumb?: string) {
  if (!pb) return '';
  return pb.files.getUrl(record, filename, thumb ? { thumb } : undefined);
}
