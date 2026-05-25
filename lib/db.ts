import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

// Types
export interface User {
  id: string
  username: string
  password: string
  role: 'admin' | 'receptionist'
  name: string
  mustChangePassword: boolean
  createdAt: string
  updatedAt: string
}

export interface Patient {
  id: string
  fileNumber: string
  name: string
  phone: string
  email?: string
  dateOfBirth: string
  gender: 'male' | 'female'
  address?: string
  medicalHistory?: string
  allergies?: string
  notes?: string
  dentalChart: DentalChart
  createdAt: string
  updatedAt: string
}

export interface ToothCondition {
  condition: 'healthy' | 'cavity' | 'filling' | 'crown' | 'extraction' | 'root-canal'
  notes?: string
  date: string
}

export interface DentalChart {
  [toothNumber: string]: ToothCondition
}

export interface Appointment {
  id: string
  patientId: string
  patientName: string
  date: string
  startTime: string
  endTime: string
  type: string
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show'
  notes?: string
  treatmentPlanId?: string
  createdAt: string
  updatedAt: string
}

export interface Treatment {
  id: string
  name: string
  description?: string
  cost: number
  toothNumber?: string
  status: 'planned' | 'in-progress' | 'completed'
  completedDate?: string
}

export interface TreatmentPlan {
  id: string
  patientId: string
  patientName: string
  treatments: Treatment[]
  totalCost: number
  paidAmount: number
  status: 'active' | 'completed' | 'cancelled'
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Invoice {
  id: string
  invoiceNumber: string
  patientId: string
  patientName: string
  treatmentPlanId?: string
  items: InvoiceItem[]
  subtotal: number
  discount: number
  tax: number
  total: number
  paidAmount: number
  status: 'draft' | 'pending' | 'paid' | 'partial' | 'cancelled'
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface InventoryItem {
  id: string
  name: string
  category: string
  quantity: number
  unit: string
  minStock: number
  costPrice: number
  supplier?: string
  expiryDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Settings {
  id: string
  clinicName: string
  clinicAddress: string
  clinicPhone: string
  clinicEmail?: string
  workingHoursStart: string
  workingHoursEnd: string
  appointmentDuration: number
  invoiceCounter: number
  updatedAt: string
}

interface DentalClinicDB extends DBSchema {
  users: {
    key: string
    value: User
    indexes: { 'by-username': string }
  }
  patients: {
    key: string
    value: Patient
    indexes: { 'by-name': string; 'by-phone': string; 'by-fileNumber': string }
  }
  appointments: {
    key: string
    value: Appointment
    indexes: { 'by-date': string; 'by-patient': string }
  }
  treatmentPlans: {
    key: string
    value: TreatmentPlan
    indexes: { 'by-patient': string }
  }
  invoices: {
    key: string
    value: Invoice
    indexes: { 'by-patient': string; 'by-number': string }
  }
  inventory: {
    key: string
    value: InventoryItem
    indexes: { 'by-category': string; 'by-name': string }
  }
  settings: {
    key: string
    value: Settings
  }
}

const DB_NAME = 'sara-dental-clinic'
const DB_VERSION = 1

let dbInstance: IDBPDatabase<DentalClinicDB> | null = null

export async function getDB(): Promise<IDBPDatabase<DentalClinicDB>> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB<DentalClinicDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Users store
      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'id' })
        userStore.createIndex('by-username', 'username', { unique: true })
      }

      // Patients store
      if (!db.objectStoreNames.contains('patients')) {
        const patientStore = db.createObjectStore('patients', { keyPath: 'id' })
        patientStore.createIndex('by-name', 'name')
        patientStore.createIndex('by-phone', 'phone')
        patientStore.createIndex('by-fileNumber', 'fileNumber', { unique: true })
      }

      // Appointments store
      if (!db.objectStoreNames.contains('appointments')) {
        const appointmentStore = db.createObjectStore('appointments', { keyPath: 'id' })
        appointmentStore.createIndex('by-date', 'date')
        appointmentStore.createIndex('by-patient', 'patientId')
      }

      // Treatment Plans store
      if (!db.objectStoreNames.contains('treatmentPlans')) {
        const treatmentStore = db.createObjectStore('treatmentPlans', { keyPath: 'id' })
        treatmentStore.createIndex('by-patient', 'patientId')
      }

      // Invoices store
      if (!db.objectStoreNames.contains('invoices')) {
        const invoiceStore = db.createObjectStore('invoices', { keyPath: 'id' })
        invoiceStore.createIndex('by-patient', 'patientId')
        invoiceStore.createIndex('by-number', 'invoiceNumber', { unique: true })
      }

      // Inventory store
      if (!db.objectStoreNames.contains('inventory')) {
        const inventoryStore = db.createObjectStore('inventory', { keyPath: 'id' })
        inventoryStore.createIndex('by-category', 'category')
        inventoryStore.createIndex('by-name', 'name')
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' })
      }
    },
  })

  return dbInstance
}

// Initialize default data
export async function initializeDB() {
  const db = await getDB()

  // Check if admin user exists - use try-catch to handle race conditions
  try {
    const adminUser = await db.getFromIndex('users', 'by-username', 'admin')
    if (!adminUser) {
      const defaultAdmin: User = {
        id: crypto.randomUUID(),
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        name: 'مدير النظام',
        mustChangePassword: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      // Use add() instead of put() to avoid overwriting existing user
      await db.add('users', defaultAdmin)
    }
  } catch (error) {
    // User already exists, ignore the constraint error
    console.log('Admin user already exists or initialization skipped')
  }

  // Check if settings exist
  try {
    const settings = await db.get('settings', 'main')
    if (!settings) {
      const defaultSettings: Settings = {
        id: 'main',
        clinicName: 'Sara Dental Clinic',
        clinicAddress: 'دمشق، سوريا',
        clinicPhone: '09XXXXXXXX',
        workingHoursStart: '09:00',
        workingHoursEnd: '21:00',
        appointmentDuration: 30,
        invoiceCounter: 0,
        updatedAt: new Date().toISOString(),
      }
      await db.put('settings', defaultSettings)
    }
  } catch (error) {
    console.log('Settings already exist or initialization skipped')
  }
}

// User operations
export async function authenticateUser(username: string, password: string): Promise<User | null> {
  const db = await getDB()
  const user = await db.getFromIndex('users', 'by-username', username)
  if (user && user.password === password) {
    return user
  }
  return null
}

export async function updateUserPassword(userId: string, newPassword: string): Promise<void> {
  const db = await getDB()
  const user = await db.get('users', userId)
  if (user) {
    user.password = newPassword
    user.mustChangePassword = false
    user.updatedAt = new Date().toISOString()
    await db.put('users', user)
  }
}

export async function getAllUsers(): Promise<User[]> {
  const db = await getDB()
  return db.getAll('users')
}

export async function createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
  const db = await getDB()
  
  // Check if username already exists
  const existingUser = await db.getFromIndex('users', 'by-username', user.username)
  if (existingUser) {
    throw new Error('اسم المستخدم موجود بالفعل')
  }
  
  const newUser: User = {
    ...user,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  await db.add('users', newUser)
  return newUser
}

export async function deleteUser(userId: string): Promise<void> {
  const db = await getDB()
  await db.delete('users', userId)
}

// Patient operations
export async function getAllPatients(): Promise<Patient[]> {
  const db = await getDB()
  return db.getAll('patients')
}

export async function getPatient(id: string): Promise<Patient | undefined> {
  const db = await getDB()
  return db.get('patients', id)
}

export async function createPatient(patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt' | 'dentalChart'>): Promise<Patient> {
  const db = await getDB()
  
  // Generate file number
  const patients = await db.getAll('patients')
  const fileNumber = `SDC-${String(patients.length + 1).padStart(5, '0')}`
  
  // Initialize dental chart with all 32 teeth as healthy
  const dentalChart: DentalChart = {}
  const teethNumbers = [
    '18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28',
    '48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'
  ]
  teethNumbers.forEach(tooth => {
    dentalChart[tooth] = { condition: 'healthy', date: new Date().toISOString() }
  })
  
  const newPatient: Patient = {
    ...patient,
    id: crypto.randomUUID(),
    fileNumber,
    dentalChart,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  await db.put('patients', newPatient)
  return newPatient
}

export async function updatePatient(id: string, updates: Partial<Patient>): Promise<Patient | undefined> {
  const db = await getDB()
  const patient = await db.get('patients', id)
  if (patient) {
    const updated = { ...patient, ...updates, updatedAt: new Date().toISOString() }
    await db.put('patients', updated)
    return updated
  }
  return undefined
}

export async function updateToothCondition(
  patientId: string, 
  toothNumber: string, 
  condition: ToothCondition
): Promise<Patient | undefined> {
  const db = await getDB()
  const patient = await db.get('patients', patientId)
  if (patient) {
    patient.dentalChart[toothNumber] = condition
    patient.updatedAt = new Date().toISOString()
    await db.put('patients', patient)
    return patient
  }
  return undefined
}

export async function searchPatients(query: string): Promise<Patient[]> {
  const db = await getDB()
  const patients = await db.getAll('patients')
  const lowerQuery = query.toLowerCase()
  return patients.filter(p => 
    p.name.toLowerCase().includes(lowerQuery) ||
    p.phone.includes(query) ||
    p.fileNumber.toLowerCase().includes(lowerQuery)
  )
}

// Appointment operations
export async function getAllAppointments(): Promise<Appointment[]> {
  const db = await getDB()
  return db.getAll('appointments')
}

export async function getAppointmentsByDate(date: string): Promise<Appointment[]> {
  const db = await getDB()
  return db.getAllFromIndex('appointments', 'by-date', date)
}

export async function getAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
  const db = await getDB()
  return db.getAllFromIndex('appointments', 'by-patient', patientId)
}

export async function createAppointment(appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Appointment> {
  const db = await getDB()
  const newAppointment: Appointment = {
    ...appointment,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  await db.put('appointments', newAppointment)
  return newAppointment
}

export async function updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | undefined> {
  const db = await getDB()
  const appointment = await db.get('appointments', id)
  if (appointment) {
    const updated = { ...appointment, ...updates, updatedAt: new Date().toISOString() }
    await db.put('appointments', updated)
    return updated
  }
  return undefined
}

export async function deleteAppointment(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('appointments', id)
}

export async function checkAppointmentOverlap(
  date: string, 
  startTime: string, 
  endTime: string, 
  excludeId?: string
): Promise<boolean> {
  const db = await getDB()
  const appointments = await db.getAllFromIndex('appointments', 'by-date', date)
  
  return appointments.some(apt => {
    if (excludeId && apt.id === excludeId) return false
    if (apt.status === 'cancelled') return false
    
    const aptStart = apt.startTime
    const aptEnd = apt.endTime
    
    // Check for overlap
    return (startTime < aptEnd && endTime > aptStart)
  })
}

// Treatment Plan operations
export async function getAllTreatmentPlans(): Promise<TreatmentPlan[]> {
  const db = await getDB()
  return db.getAll('treatmentPlans')
}

export async function getTreatmentPlansByPatient(patientId: string): Promise<TreatmentPlan[]> {
  const db = await getDB()
  return db.getAllFromIndex('treatmentPlans', 'by-patient', patientId)
}

export async function createTreatmentPlan(plan: Omit<TreatmentPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<TreatmentPlan> {
  const db = await getDB()
  const newPlan: TreatmentPlan = {
    ...plan,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  await db.put('treatmentPlans', newPlan)
  return newPlan
}

export async function updateTreatmentPlan(id: string, updates: Partial<TreatmentPlan>): Promise<TreatmentPlan | undefined> {
  const db = await getDB()
  const plan = await db.get('treatmentPlans', id)
  if (plan) {
    const updated = { ...plan, ...updates, updatedAt: new Date().toISOString() }
    await db.put('treatmentPlans', updated)
    return updated
  }
  return undefined
}

// Invoice operations
export async function getAllInvoices(): Promise<Invoice[]> {
  const db = await getDB()
  return db.getAll('invoices')
}

export async function getInvoicesByPatient(patientId: string): Promise<Invoice[]> {
  const db = await getDB()
  return db.getAllFromIndex('invoices', 'by-patient', patientId)
}

export async function generateInvoiceNumber(): Promise<string> {
  const db = await getDB()
  const settings = await db.get('settings', 'main')
  if (!settings) throw new Error('Settings not found')
  
  const year = new Date().getFullYear().toString().slice(-2)
  const counter = settings.invoiceCounter + 1
  const invoiceNumber = `SDC-${year}-${String(counter).padStart(4, '0')}`
  
  settings.invoiceCounter = counter
  settings.updatedAt = new Date().toISOString()
  await db.put('settings', settings)
  
  return invoiceNumber
}

export async function createInvoice(invoice: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt'>): Promise<Invoice> {
  const db = await getDB()
  const invoiceNumber = await generateInvoiceNumber()
  const newInvoice: Invoice = {
    ...invoice,
    id: crypto.randomUUID(),
    invoiceNumber,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  await db.put('invoices', newInvoice)
  return newInvoice
}

export async function updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined> {
  const db = await getDB()
  const invoice = await db.get('invoices', id)
  if (invoice) {
    const updated = { ...invoice, ...updates, updatedAt: new Date().toISOString() }
    await db.put('invoices', updated)
    return updated
  }
  return undefined
}

// Inventory operations
export async function getAllInventory(): Promise<InventoryItem[]> {
  const db = await getDB()
  return db.getAll('inventory')
}

export async function getInventoryByCategory(category: string): Promise<InventoryItem[]> {
  const db = await getDB()
  return db.getAllFromIndex('inventory', 'by-category', category)
}

export async function createInventoryItem(item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventoryItem> {
  const db = await getDB()
  const newItem: InventoryItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  await db.put('inventory', newItem)
  return newItem
}

export async function updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem | undefined> {
  const db = await getDB()
  const item = await db.get('inventory', id)
  if (item) {
    const updated = { ...item, ...updates, updatedAt: new Date().toISOString() }
    await db.put('inventory', updated)
    return updated
  }
  return undefined
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('inventory', id)
}

export async function getLowStockItems(): Promise<InventoryItem[]> {
  const db = await getDB()
  const items = await db.getAll('inventory')
  return items.filter(item => item.quantity <= item.minStock)
}

// Settings operations
export async function getSettings(): Promise<Settings | undefined> {
  const db = await getDB()
  return db.get('settings', 'main')
}

export async function updateSettings(updates: Partial<Settings>): Promise<Settings | undefined> {
  const db = await getDB()
  const settings = await db.get('settings', 'main')
  if (settings) {
    const updated = { ...settings, ...updates, updatedAt: new Date().toISOString() }
    await db.put('settings', updated)
    return updated
  }
  return undefined
}

export interface BackupMetadata {
  clinicName: string
  backupDate: string
  appVersion: string
  totalRecords: number
}

export interface DatabaseBackupPayload {
  metadata: BackupMetadata
  users: User[]
  patients: Patient[]
  appointments: Appointment[]
  treatments: TreatmentPlan[]
  invoices: Invoice[]
  inventory: InventoryItem[]
  clinicInfo: Settings
}

export async function getDatabaseBackupPayload(appVersion: string): Promise<DatabaseBackupPayload> {
  const db = await getDB()

  const [users, patients, appointments, treatments, invoices, inventory, clinicInfo] = await Promise.all([
    db.getAll('users'),
    db.getAll('patients'),
    db.getAll('appointments'),
    db.getAll('treatmentPlans'),
    db.getAll('invoices'),
    db.getAll('inventory'),
    db.get('settings', 'main'),
  ])

  if (!clinicInfo) {
    throw new Error('Clinic info not found')
  }

  const totalRecords =
    users.length +
    patients.length +
    appointments.length +
    treatments.length +
    invoices.length +
    inventory.length +
    1

  return {
    metadata: {
      clinicName: clinicInfo.clinicName,
      backupDate: new Date().toISOString(),
      appVersion,
      totalRecords,
    },
    users,
    patients,
    appointments,
    treatments,
    invoices,
    inventory,
    clinicInfo,
  }
}

export async function clearDatabase(): Promise<void> {
  const db = await getDB()
  await db.transaction('readwrite', ['users', 'patients', 'appointments', 'treatmentPlans', 'invoices', 'inventory', 'settings'], async () => {
    await db.clear('users')
    await db.clear('patients')
    await db.clear('appointments')
    await db.clear('treatmentPlans')
    await db.clear('invoices')
    await db.clear('inventory')
    await db.clear('settings')
  })
}

export async function restoreDatabaseBackup(backup: DatabaseBackupPayload): Promise<void> {
  const db = await getDB()
  const settings = { ...backup.clinicInfo, id: backup.clinicInfo.id ?? 'main' }

  await db.transaction('readwrite', ['users', 'patients', 'appointments', 'treatmentPlans', 'invoices', 'inventory', 'settings'], async () => {
    await db.clear('users')
    await db.clear('patients')
    await db.clear('appointments')
    await db.clear('treatmentPlans')
    await db.clear('invoices')
    await db.clear('inventory')
    await db.clear('settings')

    for (const user of backup.users) {
      await db.put('users', user)
    }

    for (const patient of backup.patients) {
      await db.put('patients', patient)
    }

    for (const appointment of backup.appointments) {
      await db.put('appointments', appointment)
    }

    for (const treatment of backup.treatments) {
      await db.put('treatmentPlans', treatment)
    }

    for (const invoice of backup.invoices) {
      await db.put('invoices', invoice)
    }

    for (const item of backup.inventory) {
      await db.put('inventory', item)
    }

    await db.put('settings', settings)
  })
}

// Report helpers
export async function getRevenueStats(startDate: string, endDate: string) {
  const db = await getDB()
  const invoices = await db.getAll('invoices')
  
  const filteredInvoices = invoices.filter(inv => {
    const date = inv.createdAt.split('T')[0]
    return date >= startDate && date <= endDate && inv.status !== 'cancelled'
  })
  
  const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0)
  const totalPending = filteredInvoices.reduce((sum, inv) => sum + (inv.total - inv.paidAmount), 0)
  
  return { totalRevenue, totalPending, invoiceCount: filteredInvoices.length }
}

export async function getAppointmentStats(startDate: string, endDate: string) {
  const db = await getDB()
  const appointments = await db.getAll('appointments')
  
  const filtered = appointments.filter(apt => {
    return apt.date >= startDate && apt.date <= endDate
  })
  
  const byStatus = filtered.reduce((acc, apt) => {
    acc[apt.status] = (acc[apt.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return { total: filtered.length, byStatus }
}
