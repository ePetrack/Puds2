import { z } from 'zod';

// Client validation schema
export const clientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name is too long'),
  contact_name: z.string().max(200).optional().or(z.literal('')),
  contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  contact_phone: z.string().max(50).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(50).optional().or(z.literal('')),
  zip: z.string().max(20).optional().or(z.literal('')),
  contract_start_date: z.string().optional().or(z.literal('')),
  contract_end_date: z.string().optional().or(z.literal('')),
  contract_value: z.number().min(0).optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'prospective']),
  notes: z.string().optional().or(z.literal('')),
});

export type ClientFormData = z.infer<typeof clientSchema>;

// Project validation schema
export const projectSchema = z.object({
  client: z.string().min(1, 'Client is required'),
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().optional().or(z.literal('')),
  status: z.enum(['planning', 'approved', 'in_progress', 'completed', 'on_hold', 'cancelled']),
  start_date: z.string().optional().or(z.literal('')),
  end_date: z.string().optional().or(z.literal('')),
  budget: z.number().min(0).optional().or(z.literal('')),
  actual_cost: z.number().min(0).optional().or(z.literal('')),
  expected_annual_savings: z.number().min(0).optional().or(z.literal('')),
  actual_annual_savings: z.number().min(0).optional().or(z.literal('')),
  roi_years: z.number().min(0).optional().or(z.literal('')),
  buildings: z.array(z.string()).optional(),
  assigned_to: z.array(z.string()).optional(),
});

export type ProjectFormData = z.infer<typeof projectSchema>;

// Building validation schema
export const buildingSchema = z.object({
  client: z.string().min(1, 'Client is required'),
  name: z.string().min(1, 'Name is required').max(200),
  square_footage: z.number().min(0).optional().or(z.literal('')),
  building_type: z.enum(['academic', 'administrative', 'residential', 'laboratory', 'athletic', 'library', 'healthcare', 'dining', 'other']).optional().or(z.literal('')),
  year_built: z.number().min(1800).max(new Date().getFullYear() + 10).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  floors: z.number().min(1).optional().or(z.literal('')),
  occupancy: z.number().min(0).optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

export type BuildingFormData = z.infer<typeof buildingSchema>;
