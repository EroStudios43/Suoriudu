import { useEffect, useState, useRef } from "react"
import { useLocation } from "react-router-dom"

const useFetchData = (fetchFunction, stateKey) => {
  // Get location and make ref
  const location = useLocation()
  const controllerRef = useRef(null)

  // Fields for data, loading and error
  // Set state data if there is data from previous page
  const [data, setData ] = useState(location.state?.[stateKey] || null)
  // If the state is set, loading false. If not, true.
  const [loading, setLoading] = useState(!location.state?.[stateKey])
  const [error, setError] = useState(null)

  const getData = async () => {
    // Cancel previous request if there is one.
    if (controllerRef.current) {
      controllerRef.current.abort()
    }

    // Create new controller. The request can be cancelled this way if needed.
    const controller = new AbortController()
    controllerRef.current = controller

    // Fetch the data in a try - catch - finally
    try {
      setLoading(true)
      const result = await fetchFunction(controller.signal)
      setData(result)
      setError(null)
    } catch (error) {
      if (error.name !== "CanceledError" && error.name !== "AbortError") {
        setError(error)
      }
    } finally {
      setLoading(false)
    }
  }

  // Call the fetchdata when mounted
  useEffect(() => {
    getData()
    return () => {
      // Abort if there
      if (controllerRef.current) {
        controllerRef.current.abort()
      }
    }
  }, [])

  return { data, loading, error, refetch: getData, setData}
}

export default useFetchData