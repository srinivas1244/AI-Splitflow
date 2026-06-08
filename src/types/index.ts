export interface Profile {
  id: string
  email?: string | null

  full_name: string | null
  avatar_url: string | null

  split_id: string | null

  created_at: string
  updated_at?: string | null
}

export interface Friendship {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  updated_at?: string | null
  
  requester?: Profile
  addressee?: Profile
}

export interface Group {
  id: string

  name: string
  description?: string | null

  created_by: string

  created_at: string
  updated_at?: string | null
}

export interface GroupMember {
  id: string

  group_id: string
  user_id: string
  role: 'admin' | 'member'

  joined_at: string

  profile?: Profile
}

export interface Expense {
  id: string

  title: string
  description?: string | null

  amount: number

  paid_by: string
  split_type: 'equal' | 'custom' | 'percentage' | 'shares' | 'itemized'
  category: 'food' | 'transport' | 'accommodation' | 'entertainment' | 'utilities' | 'other'
  date: string

  group_id?: string | null

  created_by: string

  created_at: string
}

export interface ExpenseSplit {
  id: string

  expense_id: string
  user_id: string

  amount: number

  is_settled: boolean

  created_at: string
}

export interface Settlement {
  id: string

  payer_id: string
  payee_id: string

  from_user: string
  to_user: string

  amount: number

  group_id?: string | null
  note?: string | null

  created_at: string
}

export interface DashboardStats {
  totalOwed: number
  totalOwing: number
  totalExpenses: number
  activeGroups: number
}

export interface ExpenseAttachment {
  id: string
  expense_id: string
  file_name: string
  file_type: string
  file_size: number
  storage_path: string
  uploaded_by: string
  created_at: string
}

export interface ExpenseComment {
  id: string
  expense_id: string
  user_id: string
  comment: string
  created_at: string
  profile?: Profile
}

export interface ExpenseHistory {
  id: string
  expense_id: string
  user_id: string
  action: 'created' | 'edited' | 'deleted'
  changes?: Record<string, any>
  created_at: string
  profile?: Profile
}

export interface ExpenseItem {
  id: string
  expense_id: string
  name: string
  amount: number
  assigned_to?: string | null
  created_at: string
  profile?: Profile
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}