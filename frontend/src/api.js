import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
})

export const getTrends = async (filters, gameMode = 'pureFiction') => {
  try {
    const payload = { ...filters, gameMode }
    const response = await api.post('/api/trends', payload)
    return response.data || []
  } catch (error) {
    console.error('getTrends error:', error)
    throw new Error(error.response?.data?.detail || error.message || 'Failed to fetch trends')
  }
}

export const getCostAnalysis = async (params, gameMode = 'pureFiction') => {
  try {
    const payload = { ...params, gameMode }
    const response = await api.post('/api/cost-analysis', payload)
    return response.data || []
  } catch (error) {
    console.error('getCostAnalysis error:', error)
    throw new Error(error.response?.data?.detail || error.message || 'Failed to fetch cost analysis')
  }
}

export const getSurvivalAnalysis = async (params, gameMode = 'pureFiction') => {
  try {
    const payload = { ...params, gameMode }
    const response = await api.post('/api/survival-analysis', payload)
    return response.data || []
  } catch (error) {
    console.error('getSurvivalAnalysis error:', error)
    throw new Error(error.response?.data?.detail || error.message || 'Failed to fetch survival analysis')
  }
}

export const getUsageTrend = async (character, gameMode = 'pureFiction', floorType = null) => {
  try {
    const payload = { character, gameMode, floor_type: floorType }
    const response = await api.post('/api/usage-trend', payload)
    return response.data || []
  } catch (error) {
    console.error('getUsageTrend error:', error)
    throw new Error(error.response?.data?.detail || error.message || 'Failed to fetch usage trend')
  }
}

export const getCharacters = async () => {
  try {
    const response = await api.get('/api/characters')
    return response.data || []
  } catch (error) {
    console.error('getCharacters error:', error)
    throw new Error(error.response?.data?.detail || error.message || 'Failed to fetch characters')
  }
}

export const getAvailablePatches = async (characterName, gameMode = 'pureFiction') => {
  try {
    const response = await api.get('/api/available-patches', {
      params: { character: characterName, gameMode }
    })
    return response.data.patches || []
  } catch (error) {
    console.error('getAvailablePatches error:', error)
    throw new Error(error.response?.data?.detail || error.message || 'Failed to fetch available patches')
  }
}


export const uploadCSV = async (file, password) => {
  try {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/admin/upload', formData, {
      headers: {
        'x-admin-password': password,
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  } catch (error) {
    console.error('uploadCSV error:', error)
    throw new Error(error.response?.data?.detail || error.message || 'Upload failed')
  }
}

export const getAAAvgCycles = async (floorType = 'knights', filters = {}) => {
  try {
    const payload = { floor_type: floorType, ...filters }
    const response = await api.post('/api/aa/avg-cycles', payload)
    return response.data || []
  } catch (error) {
    console.error('getAAAvgCycles error:', error)
    throw new Error(error.response?.data?.detail || error.message || 'Failed to fetch AA avg cycles')
  }
}

export const getAADistribution = async (floorType = 'knights', filters = {}) => {
  try {
    const payload = { floor_type: floorType, ...filters }
    const response = await api.post('/api/aa/distribution', payload)
    return response.data || []
  } catch (error) {
    console.error('getAADistribution error:', error)
    throw new Error(error.response?.data?.detail || error.message || 'Failed to fetch AA distribution')
  }
}

export const getAACostAnalysis = async (characterName, floorType = 'knights', filters = {}) => {
  try {
    const payload = {
      character: characterName,
      floor_type: floorType,
      gameMode: 'anomalyArbitration',
      ...filters
    }
    const response = await api.post('/api/cost-analysis', payload)
    return response.data || []
  } catch (error) {
    console.error('getAACostAnalysis error:', error)
    throw new Error(error.response?.data?.detail || error.message || 'Failed to fetch AA cost analysis')
  }
}

export const getAAHardModeStats = async (patch) => {
  try {
    const response = await api.post('/api/aa/hard-mode-stats', {
      patch: patch
    })
    return response.data
  } catch (error) {
    console.error('getAAHardModeStats error:', error)
    throw new Error(error.response?.data?.detail || error.message || 'Failed to fetch hard mode stats')
  }
}

export const getAllPatches = async () => {
  try {
    const response = await api.get('/api/all-patches')
    return response.data.patches || []
  } catch (error) {
    console.error('getAllPatches error:', error)
    throw new Error(error.response?.data?.detail || error.message || 'Failed to fetch all patches')
  }
}

export const getAAPatches = async () => {
  try {
    const response = await api.get('/api/aa/patches')
    return response.data.patches || []
  } catch (error) {
    console.error('getAAPatches error:', error)
    throw new Error(error.response?.data?.detail || error.message || 'Failed to fetch AA patches')
  }
}

export const getAAPassingRateTrend = async () => {
  try {
    const response = await api.get('/api/aa/passing-rate-trend')
    return response.data || []
  } catch (error) {
    console.error('getAAPassingRateTrend error:', error)
    throw new Error(error.response?.data?.detail || error.message || 'Failed to fetch passing rate trend')
  }
}

export const getAAPeasantModeStats = async () => {
  try {
    const response = await api.get('/api/aa/peasant-mode-stats')
    return response.data
  } catch (error) {
    console.error('getAAPeasantModeStats error:', error)
    throw new Error(error.response?.data?.detail || error.message || 'Failed to fetch peasant mode stats')
  }
}

export const getPFTierListPatches = async () => {
  try {
    const response = await api.get('/api/tierlist/pf/patches')
    return response.data.patches || []
  } catch (error) {
    console.error('getPFTierListPatches error:', error)
    throw new Error(error.response?.data?.detail || error.message || 'Failed to fetch PF patches')
  }
}

export const getPFTierList = async (patch, excludedCharacters = [], signatureOnly = false) => {
  try {
    const response = await api.post('/api/tierlist/pf', {
      patch: patch || null,
      excluded_characters: excludedCharacters,
      signature_only: signatureOnly
    })
    return response.data || []
  } catch (error) {
    console.error('getPFTierList error:', error)
    throw new Error(error.response?.data?.detail || error.message || 'Failed to fetch PF tier list')
  }
}

export const getMOCTierListPatches = async () => {
  try {
    const response = await api.get('/api/tierlist/moc/patches')
    return response.data.patches || []
  } catch (error) {
    throw new Error(error.response?.data?.detail || error.message)
  }
}

export const getMOCTierList = async (patch, excludedCharacters = [], signatureOnly = false) => {
  try {
    const response = await api.post('/api/tierlist/moc', { patch: patch || null, excluded_characters: excludedCharacters, signature_only: signatureOnly })
    return response.data || []
  } catch (error) {
    throw new Error(error.response?.data?.detail || error.message)
  }
}

export const getAATierListPatches = async () => {
  try {
    const response = await api.get('/api/tierlist/aa/patches')
    return response.data.patches || []
  } catch (error) {
    throw new Error(error.response?.data?.detail || error.message)
  }
}

export const getAATierList = async (patch, excludedCharacters = [], signatureOnly = false) => {
  try {
    const response = await api.post('/api/tierlist/aa', { patch: patch || null, excluded_characters: excludedCharacters, signature_only: signatureOnly })
    return response.data || []
  } catch (error) {
    throw new Error(error.response?.data?.detail || error.message)
  }
}

export const getASTierListPatches = async () => {
  try {
    const response = await api.get('/api/tierlist/as/patches')
    return response.data.patches || []
  } catch (error) {
    console.error('getASTierListPatches error:', error)
    throw new Error(error.response?.data?.detail || error.message || 'Failed to fetch AS patches')
  }
}

export const getASTierList = async (patch, excludedCharacters = [], signatureOnly = false) => {
  try {
    const response = await api.post('/api/tierlist/as', {
      patch: patch || null,
      excluded_characters: excludedCharacters,
      signature_only: signatureOnly
    })
    return response.data || []
  } catch (error) {
    console.error('getASTierList error:', error)
    throw new Error(error.response?.data?.detail || error.message || 'Failed to fetch tier list')
  }
}

export const getOverallTierListPatches = async () => {
  try {
    const response = await api.get('/api/tierlist/overall/patches')
    return response.data.patches || []
  } catch (error) {
    throw new Error(error.response?.data?.detail || error.message)
  }
}

export const getOverallTierList = async (patch, excludedCharacters = [], signatureOnly = false) => {
  try {
    const response = await api.post('/api/tierlist/overall', {
      patch: patch || null,
      excluded_characters: excludedCharacters,
      signature_only: signatureOnly
    })
    return response.data || []
  } catch (error) {
    console.error('getOverallTierList error:', error)
    throw new Error(error.response?.data?.detail || error.message || 'Failed to fetch overall tier list')
  }
}

export default api
