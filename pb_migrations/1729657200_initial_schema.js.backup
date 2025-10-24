/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  // Users collection (extends built-in users)
  const usersCollection = new Collection({
    name: 'users',
    type: 'auth',
    system: false,
    schema: [
      {
        name: 'name',
        type: 'text',
        required: true,
      },
      {
        name: 'role',
        type: 'select',
        required: true,
        options: {
          maxSelect: 1,
          values: ['admin', 'consultant', 'client'],
        },
      },
      {
        name: 'avatar',
        type: 'file',
        required: false,
        options: {
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        },
      },
    ],
  });

  // Clients collection
  const clientsCollection = new Collection({
    name: 'clients',
    type: 'base',
    system: false,
    schema: [
      {
        name: 'name',
        type: 'text',
        required: true,
      },
      {
        name: 'contact_name',
        type: 'text',
        required: false,
      },
      {
        name: 'contact_email',
        type: 'email',
        required: false,
      },
      {
        name: 'contact_phone',
        type: 'text',
        required: false,
      },
      {
        name: 'address',
        type: 'text',
        required: false,
      },
      {
        name: 'city',
        type: 'text',
        required: false,
      },
      {
        name: 'state',
        type: 'text',
        required: false,
      },
      {
        name: 'zip',
        type: 'text',
        required: false,
      },
      {
        name: 'contract_start_date',
        type: 'date',
        required: false,
      },
      {
        name: 'contract_end_date',
        type: 'date',
        required: false,
      },
      {
        name: 'contract_value',
        type: 'number',
        required: false,
      },
      {
        name: 'status',
        type: 'select',
        required: true,
        options: {
          maxSelect: 1,
          values: ['active', 'inactive', 'prospective'],
        },
      },
      {
        name: 'notes',
        type: 'editor',
        required: false,
      },
      {
        name: 'user',
        type: 'relation',
        required: false,
        options: {
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
      },
    ],
  });

  // Buildings collection
  const buildingsCollection = new Collection({
    name: 'buildings',
    type: 'base',
    system: false,
    schema: [
      {
        name: 'client',
        type: 'relation',
        required: true,
        options: {
          collectionId: 'clients',
          cascadeDelete: true,
          maxSelect: 1,
        },
      },
      {
        name: 'name',
        type: 'text',
        required: true,
      },
      {
        name: 'square_footage',
        type: 'number',
        required: false,
      },
      {
        name: 'building_type',
        type: 'select',
        required: false,
        options: {
          maxSelect: 1,
          values: [
            'academic',
            'administrative',
            'residential',
            'laboratory',
            'athletic',
            'library',
            'healthcare',
            'dining',
            'other',
          ],
        },
      },
      {
        name: 'year_built',
        type: 'number',
        required: false,
      },
      {
        name: 'address',
        type: 'text',
        required: false,
      },
      {
        name: 'floors',
        type: 'number',
        required: false,
      },
      {
        name: 'occupancy',
        type: 'number',
        required: false,
      },
      {
        name: 'notes',
        type: 'editor',
        required: false,
      },
    ],
  });

  // Projects collection
  const projectsCollection = new Collection({
    name: 'projects',
    type: 'base',
    system: false,
    schema: [
      {
        name: 'client',
        type: 'relation',
        required: true,
        options: {
          collectionId: 'clients',
          cascadeDelete: true,
          maxSelect: 1,
        },
      },
      {
        name: 'name',
        type: 'text',
        required: true,
      },
      {
        name: 'description',
        type: 'editor',
        required: false,
      },
      {
        name: 'status',
        type: 'select',
        required: true,
        options: {
          maxSelect: 1,
          values: [
            'planning',
            'approved',
            'in_progress',
            'completed',
            'on_hold',
            'cancelled',
          ],
        },
      },
      {
        name: 'start_date',
        type: 'date',
        required: false,
      },
      {
        name: 'end_date',
        type: 'date',
        required: false,
      },
      {
        name: 'budget',
        type: 'number',
        required: false,
      },
      {
        name: 'actual_cost',
        type: 'number',
        required: false,
      },
      {
        name: 'expected_annual_savings',
        type: 'number',
        required: false,
      },
      {
        name: 'actual_annual_savings',
        type: 'number',
        required: false,
      },
      {
        name: 'roi_years',
        type: 'number',
        required: false,
      },
      {
        name: 'buildings',
        type: 'relation',
        required: false,
        options: {
          collectionId: 'buildings',
          cascadeDelete: false,
          maxSelect: 999,
        },
      },
      {
        name: 'assigned_to',
        type: 'relation',
        required: false,
        options: {
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 999,
        },
      },
    ],
  });

  // Audits collection
  const auditsCollection = new Collection({
    name: 'audits',
    type: 'base',
    system: false,
    schema: [
      {
        name: 'client',
        type: 'relation',
        required: true,
        options: {
          collectionId: 'clients',
          cascadeDelete: true,
          maxSelect: 1,
        },
      },
      {
        name: 'buildings',
        type: 'relation',
        required: false,
        options: {
          collectionId: 'buildings',
          cascadeDelete: false,
          maxSelect: 999,
        },
      },
      {
        name: 'audit_date',
        type: 'date',
        required: true,
      },
      {
        name: 'auditor',
        type: 'relation',
        required: true,
        options: {
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
      },
      {
        name: 'audit_type',
        type: 'select',
        required: true,
        options: {
          maxSelect: 1,
          values: [
            'walkthrough',
            'investment_grade',
            'retro_commissioning',
            'benchmarking',
            'other',
          ],
        },
      },
      {
        name: 'findings_summary',
        type: 'editor',
        required: false,
      },
      {
        name: 'status',
        type: 'select',
        required: true,
        options: {
          maxSelect: 1,
          values: ['scheduled', 'in_progress', 'completed', 'report_delivered'],
        },
      },
    ],
  });

  // Energy Data collection
  const energyDataCollection = new Collection({
    name: 'energy_data',
    type: 'base',
    system: false,
    schema: [
      {
        name: 'building',
        type: 'relation',
        required: true,
        options: {
          collectionId: 'buildings',
          cascadeDelete: true,
          maxSelect: 1,
        },
      },
      {
        name: 'timestamp',
        type: 'date',
        required: true,
      },
      {
        name: 'usage_kwh',
        type: 'number',
        required: false,
      },
      {
        name: 'cost',
        type: 'number',
        required: false,
      },
      {
        name: 'fuel_type',
        type: 'select',
        required: true,
        options: {
          maxSelect: 1,
          values: [
            'electricity',
            'natural_gas',
            'fuel_oil',
            'steam',
            'chilled_water',
            'propane',
            'other',
          ],
        },
      },
      {
        name: 'meter_id',
        type: 'text',
        required: false,
      },
      {
        name: 'reading_type',
        type: 'select',
        required: false,
        options: {
          maxSelect: 1,
          values: ['actual', 'estimated', 'calculated'],
        },
      },
      {
        name: 'demand_kw',
        type: 'number',
        required: false,
      },
    ],
  });

  // Recommendations collection
  const recommendationsCollection = new Collection({
    name: 'recommendations',
    type: 'base',
    system: false,
    schema: [
      {
        name: 'audit',
        type: 'relation',
        required: false,
        options: {
          collectionId: 'audits',
          cascadeDelete: true,
          maxSelect: 1,
        },
      },
      {
        name: 'project',
        type: 'relation',
        required: false,
        options: {
          collectionId: 'projects',
          cascadeDelete: false,
          maxSelect: 1,
        },
      },
      {
        name: 'building',
        type: 'relation',
        required: true,
        options: {
          collectionId: 'buildings',
          cascadeDelete: true,
          maxSelect: 1,
        },
      },
      {
        name: 'title',
        type: 'text',
        required: true,
      },
      {
        name: 'description',
        type: 'editor',
        required: false,
      },
      {
        name: 'category',
        type: 'select',
        required: false,
        options: {
          maxSelect: 1,
          values: [
            'hvac',
            'lighting',
            'envelope',
            'controls',
            'renewable',
            'behavioral',
            'other',
          ],
        },
      },
      {
        name: 'estimated_cost',
        type: 'number',
        required: false,
      },
      {
        name: 'estimated_annual_savings',
        type: 'number',
        required: false,
      },
      {
        name: 'roi_years',
        type: 'number',
        required: false,
      },
      {
        name: 'priority',
        type: 'select',
        required: true,
        options: {
          maxSelect: 1,
          values: ['low', 'medium', 'high', 'critical'],
        },
      },
      {
        name: 'status',
        type: 'select',
        required: true,
        options: {
          maxSelect: 1,
          values: [
            'proposed',
            'approved',
            'in_progress',
            'implemented',
            'rejected',
          ],
        },
      },
    ],
  });

  // Equipment collection
  const equipmentCollection = new Collection({
    name: 'equipment',
    type: 'base',
    system: false,
    schema: [
      {
        name: 'building',
        type: 'relation',
        required: true,
        options: {
          collectionId: 'buildings',
          cascadeDelete: true,
          maxSelect: 1,
        },
      },
      {
        name: 'name',
        type: 'text',
        required: true,
      },
      {
        name: 'equipment_type',
        type: 'select',
        required: true,
        options: {
          maxSelect: 1,
          values: [
            'boiler',
            'chiller',
            'air_handler',
            'heat_pump',
            'lighting_fixture',
            'controls_system',
            'pump',
            'fan',
            'other',
          ],
        },
      },
      {
        name: 'manufacturer',
        type: 'text',
        required: false,
      },
      {
        name: 'model',
        type: 'text',
        required: false,
      },
      {
        name: 'serial_number',
        type: 'text',
        required: false,
      },
      {
        name: 'install_date',
        type: 'date',
        required: false,
      },
      {
        name: 'age_years',
        type: 'number',
        required: false,
      },
      {
        name: 'efficiency_rating',
        type: 'text',
        required: false,
      },
      {
        name: 'capacity',
        type: 'text',
        required: false,
      },
      {
        name: 'maintenance_schedule',
        type: 'select',
        required: false,
        options: {
          maxSelect: 1,
          values: ['monthly', 'quarterly', 'semi_annual', 'annual'],
        },
      },
      {
        name: 'last_maintenance_date',
        type: 'date',
        required: false,
      },
      {
        name: 'notes',
        type: 'editor',
        required: false,
      },
    ],
  });

  // Documents collection
  const documentsCollection = new Collection({
    name: 'documents',
    type: 'base',
    system: false,
    schema: [
      {
        name: 'title',
        type: 'text',
        required: true,
      },
      {
        name: 'description',
        type: 'text',
        required: false,
      },
      {
        name: 'file',
        type: 'file',
        required: true,
        options: {
          maxSelect: 1,
          maxSize: 52428800, // 50MB
        },
      },
      {
        name: 'client',
        type: 'relation',
        required: false,
        options: {
          collectionId: 'clients',
          cascadeDelete: true,
          maxSelect: 1,
        },
      },
      {
        name: 'project',
        type: 'relation',
        required: false,
        options: {
          collectionId: 'projects',
          cascadeDelete: false,
          maxSelect: 1,
        },
      },
      {
        name: 'audit',
        type: 'relation',
        required: false,
        options: {
          collectionId: 'audits',
          cascadeDelete: false,
          maxSelect: 1,
        },
      },
      {
        name: 'building',
        type: 'relation',
        required: false,
        options: {
          collectionId: 'buildings',
          cascadeDelete: false,
          maxSelect: 1,
        },
      },
      {
        name: 'tags',
        type: 'text',
        required: false,
      },
      {
        name: 'uploaded_by',
        type: 'relation',
        required: true,
        options: {
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
      },
    ],
  });

  // Tasks collection
  const tasksCollection = new Collection({
    name: 'tasks',
    type: 'base',
    system: false,
    schema: [
      {
        name: 'title',
        type: 'text',
        required: true,
      },
      {
        name: 'description',
        type: 'editor',
        required: false,
      },
      {
        name: 'assigned_to',
        type: 'relation',
        required: false,
        options: {
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
      },
      {
        name: 'due_date',
        type: 'date',
        required: false,
      },
      {
        name: 'status',
        type: 'select',
        required: true,
        options: {
          maxSelect: 1,
          values: ['todo', 'in_progress', 'completed', 'cancelled'],
        },
      },
      {
        name: 'priority',
        type: 'select',
        required: true,
        options: {
          maxSelect: 1,
          values: ['low', 'medium', 'high', 'urgent'],
        },
      },
      {
        name: 'project',
        type: 'relation',
        required: false,
        options: {
          collectionId: 'projects',
          cascadeDelete: true,
          maxSelect: 1,
        },
      },
      {
        name: 'created_by',
        type: 'relation',
        required: true,
        options: {
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
      },
    ],
  });

  // Custom Views collection
  const customViewsCollection = new Collection({
    name: 'custom_views',
    type: 'base',
    system: false,
    schema: [
      {
        name: 'name',
        type: 'text',
        required: true,
      },
      {
        name: 'description',
        type: 'text',
        required: false,
      },
      {
        name: 'view_type',
        type: 'select',
        required: true,
        options: {
          maxSelect: 1,
          values: ['sql_query', 'perspective_config'],
        },
      },
      {
        name: 'sql_query',
        type: 'text',
        required: false,
      },
      {
        name: 'perspective_config',
        type: 'json',
        required: false,
      },
      {
        name: 'created_by',
        type: 'relation',
        required: true,
        options: {
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
      },
      {
        name: 'is_public',
        type: 'bool',
        required: false,
      },
      {
        name: 'category',
        type: 'select',
        required: false,
        options: {
          maxSelect: 1,
          values: [
            'energy_analysis',
            'financial',
            'project_tracking',
            'building_performance',
            'other',
          ],
        },
      },
    ],
  });

  return Dao(db).saveCollection(usersCollection) &&
    Dao(db).saveCollection(clientsCollection) &&
    Dao(db).saveCollection(buildingsCollection) &&
    Dao(db).saveCollection(projectsCollection) &&
    Dao(db).saveCollection(auditsCollection) &&
    Dao(db).saveCollection(energyDataCollection) &&
    Dao(db).saveCollection(recommendationsCollection) &&
    Dao(db).saveCollection(equipmentCollection) &&
    Dao(db).saveCollection(documentsCollection) &&
    Dao(db).saveCollection(tasksCollection) &&
    Dao(db).saveCollection(customViewsCollection);
}, (db) => {
  // Rollback
  const collections = [
    'users',
    'clients',
    'buildings',
    'projects',
    'audits',
    'energy_data',
    'recommendations',
    'equipment',
    'documents',
    'tasks',
    'custom_views',
  ];

  collections.forEach((name) => {
    try {
      Dao(db).deleteCollection(Dao(db).findCollectionByNameOrId(name));
    } catch (e) {
      // Collection might not exist
    }
  });

  return true;
});
