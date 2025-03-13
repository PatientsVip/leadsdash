import { createClient } from '@supabase/supabase-js'

// Initialize the Supabase client
const supabaseUrl = 'https://doodxagvklnhksmatcee.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvb2R4YWd2a2xuaGtzbWF0Y2VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEzMzA4NzksImV4cCI6MjA1NjkwNjg3OX0.vbRA5aMBvCJyZyjwUtuQcqSEi3ZXwTc3vRa2rU47g5Y'
const supabase = createClient(supabaseUrl, supabaseKey)

// Example function to fetch data from a table
export async function fetchTableData(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
    
    if (error) {
      throw error
    }
    
    return data
  } catch (error) {
    console.error('Error fetching data:', error.message)
    return []
  }
}

// Example function to insert data into a table
export async function insertData(tableName, data) {
  try {
    const { data: result, error } = await supabase
      .from(tableName)
      .insert([data])
      .select()
    
    if (error) {
      throw error
    }
    
    return result
  } catch (error) {
    console.error('Error inserting data:', error.message)
    return null
  }
}

// Example function to update data in a table
export async function updateData(tableName, id, updates) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .update(updates)
      .eq('id', id)
      .select()
    
    if (error) {
      throw error
    }
    
    return data
  } catch (error) {
    console.error('Error updating data:', error.message)
    return null
  }
}

// Example function to delete data from a table
export async function deleteData(tableName, id) {
  try {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id)
    
    if (error) {
      throw error
    }
    
    return true
  } catch (error) {
    console.error('Error deleting data:', error.message)
    return false
  }
}

// Example function for real-time subscriptions
export function subscribeToChanges(tableName, callback) {
  const subscription = supabase
    .channel(`public:${tableName}`)
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: tableName },
      (payload) => {
        callback(payload)
      }
    )
    .subscribe()
  
  return subscription
}

// Function to get total signups by hospital
export async function getTotalSignupsByHospital() {
  try {
    const { data, error } = await supabase
      .from('leads_82')
      .select('hospital_name, count(*)')
      .group('hospital_name')
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching total signups:', error.message)
    return []
  }
}

// Function to get signups in last 7 days by hospital
export async function getRecentSignupsByHospital() {
  try {
    const { data, error } = await supabase
      .from('leads_82')
      .select('hospital_name, count(*)')
      .gte('contact_submitted_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .group('hospital_name')
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching recent signups:', error.message)
    return []
  }
}

// Function to get qualification metrics by hospital
export async function getQualificationMetrics() {
  try {
    const { data, error } = await supabase
      .from('leads_82')
      .select('hospital_name, qualified, count(*)')
      .not('qualified', 'is', null)
      .group('hospital_name, qualified')
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching qualification metrics:', error.message)
    return []
  }
}

// Function to get photo submission metrics for qualified leads
export async function getPhotoSubmissionMetrics() {
  try {
    const { data, error } = await supabase
      .from('leads_82')
      .select('hospital_name, count(*)')
      .eq('qualified', 'qualified')
      .eq('photo_submitted_at', true)
      .group('hospital_name')
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching photo submission metrics:', error.message)
    return []
  }
}

// Function to get daily signup averages by hospital
export async function getDailyAverageSignups() {
  try {
    const { data, error } = await supabase
      .rpc('calculate_daily_average_signups')  // We'll create this database function
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching daily averages:', error.message)
    return []
  }
}

// Function to get signups by date range and hospital
export async function getSignupsByDateRange(startDate, endDate) {
  try {
    const { data, error } = await supabase
      .from('leads_82')
      .select('hospital_name, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching signups by date range:', error.message)
    return []
  }
}

// Helper function to calculate daily average
function calculateDailyAverage(data) {
  if (!data.length) return 0
  
  // Get the date range
  const dates = data.map(lead => new Date(lead.created_at))
  const minDate = new Date(Math.min(...dates))
  const maxDate = new Date(Math.max(...dates))
  
  // Calculate total days (including days with no signups)
  const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1
  
  return (data.length / totalDays).toFixed(1)
}

// Helper function to calculate this week's average
function calculateWeekAverage(data) {
  if (!data.length) return 0
  
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay()) // Start from Sunday
  startOfWeek.setHours(0, 0, 0, 0)
  
  const daysIntoWeek = today.getDay() + 1 // Number of days into current week (1-7)
  
  const thisWeekSignups = data.filter(lead => {
    const leadDate = new Date(lead.created_at)
    return leadDate >= startOfWeek && leadDate <= today
  }).length
  
  return (thisWeekSignups / daysIntoWeek).toFixed(1)
}

// Get overview metrics for all hospitals or a specific hospital
export async function getOverviewMetrics(hospitalName = null) {
  try {
    let query = supabase
      .from('leads_82')
      .select('*')

    if (hospitalName) {
      query = query.eq('hospital_name', hospitalName)
    }

    const { data, error } = await query

    if (error) throw error

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const metrics = {
      totalSignups: data.length,
      last7Days: data.filter(lead => new Date(lead.created_at) >= sevenDaysAgo).length,
      averagePerDay: calculateDailyAverage(data),
      weekAverage: calculateWeekAverage(data),
      qualified: data.filter(lead => lead.qualified === 'qualified').length,
      disqualified: data.filter(lead => lead.qualified === 'DNQ').length,
      photoSubmitted: data.filter(lead => lead.photo_submitted_at === true).length,
      contactSubmitted: data.filter(lead => lead.contact_submitted_at === true).length,
      prescreenSubmitted: data.filter(lead => lead.prescreen_submitted_at === true).length,
      basicSignup: data.filter(lead => 
        lead.contact_submitted_at === true && 
        lead.prescreen_submitted_at !== true
      ).length,
      hospitals: [...new Set(data.map(lead => lead.hospital_name))]
    }

    return metrics
  } catch (error) {
    console.error('Error fetching overview metrics:', error.message)
    return null
  }
}

// Get daily signup data for the line graph
export async function getDailySignups(startDate, endDate, hospitalName = null) {
  try {
    // Format dates to match Postgres timestamp format
    const formattedStartDate = startDate.toISOString()
    const formattedEndDate = new Date(endDate.setHours(23, 59, 59, 999)).toISOString()

    console.log('Fetching daily signups with params:', {
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      hospitalName
    });

    let query = supabase
      .from('leads_82')
      .select('created_at, hospital_name')
      .gte('created_at', formattedStartDate)
      .lte('created_at', formattedEndDate)

    if (hospitalName) {
      query = query.eq('hospital_name', hospitalName)
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    console.log('Raw data from Supabase:', data);

    // Group by date (using only the date part of the timestamp)
    const dailyData = data.reduce((acc, lead) => {
      // Extract just the date part (YYYY-MM-DD) from the timestamp
      const date = lead.created_at.split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {})

    console.log('Grouped by date:', dailyData);

    // Fill in missing dates with zero counts
    let currentDate = new Date(startDate)
    const endDateObj = new Date(endDate)
    const result = []

    while (currentDate <= endDateObj) {
      const dateStr = currentDate.toISOString().split('T')[0]
      result.push({
        date: dateStr,
        count: dailyData[dateStr] || 0
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    console.log('Final processed data:', result);
    return result
  } catch (error) {
    console.error('Error fetching daily signups:', error.message)
    return []
  }
}

// Get list of all hospitals
export async function getHospitalsList() {
  try {
    const { data, error } = await supabase
      .from('leads_82')
      .select('hospital_name')
      .then(result => {
        // Get unique hospital names
        const uniqueHospitals = [...new Set(result.data.map(item => item.hospital_name))]
        return {
          data: uniqueHospitals.filter(Boolean), // Remove null/undefined values
          error: result.error
        }
      })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching hospitals list:', error.message)
    return []
  }
}

// Subscribe to real-time updates
export function subscribeToLeadUpdates(callback) {
  return supabase
    .channel('leads-channel')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'leads_82' },
      callback
    )
    .subscribe()
}

// Test function to check table access
export async function testLeadsTableAccess() {
  try {
    console.log('Testing leads_82 table access...');
    
    // Try to get table info
    const { data: tableData, error: tableError } = await supabase
      .from('leads_82')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('Error accessing leads_82 table:', tableError);
      return false;
    }

    console.log('Successfully accessed leads_82 table. Sample data:', tableData);
    
    // Get table structure
    const { data: structureData, error: structureError } = await supabase
      .rpc('get_table_structure', { table_name: 'leads_82' })
      .select('*');

    if (structureError) {
      console.log('Could not fetch table structure:', structureError);
    } else {
      console.log('Table structure:', structureData);
    }

    return true;
  } catch (error) {
    console.error('Error testing table access:', error);
    return false;
  }
}

// Call this at initialization
document.addEventListener('DOMContentLoaded', async () => {
  const hasAccess = await testLeadsTableAccess();
  console.log('Has access to leads_82 table:', hasAccess);
});

// Let's also add a test function to verify the data
export async function testDataQuery() {
  try {
    console.log('Testing data query...');
    
    // Get the most recent entry
    const { data: recentData, error: recentError } = await supabase
      .from('leads_82')
      .select('created_at, hospital_name')
      .order('created_at', { ascending: false })
      .limit(1);

    if (recentError) {
      console.error('Error getting recent data:', recentError);
      return;
    }

    console.log('Most recent entry:', recentData);

    // Get count of entries in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const formattedDate = sevenDaysAgo.toISOString().replace('T', ' ').split('.')[0];

    const { data: weekData, error: weekError } = await supabase
      .from('leads_82')
      .select('created_at, hospital_name')
      .gte('created_at', formattedDate)
      .order('created_at', { ascending: true });

    if (weekError) {
      console.error('Error getting week data:', weekError);
      return;
    }

    console.log('Entries in last 7 days:', weekData);
  } catch (error) {
    console.error('Error testing data query:', error);
  }
}

// Call the test function on load
document.addEventListener('DOMContentLoaded', async () => {
  await testDataQuery();
}); 