import { useEffect, useState, useRef, useCallback } from "react"
import { useLocation } from "react-router-dom"

const useFetchData = (fetchFunction, stateKey = null) => {
  // Get location and make ref
  const location = useLocation()
  const controllerRef = useRef(null)

  // Get initial data from state. 
  const initialData = stateKey ? location.state?.[stateKey] : null

  // Fields for data, loading and error
  // Set state data if there is data from previous page
  const [data, setData ] = useState(initialData || null)
  // If the state is set, loading false. If not, true.
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState(null)

  const getData = useCallback(async () => {
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
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, [fetchFunction])

  // Call the fetchdata when the fetch function changes
  // NOTE: UseCallback should be used when configuring the frontend fetch function in order to prevent infinite looping
  //       Doing this will make sure the fetch function will not reconfigure itself when the page reloads
  //       If this is not used, the useEffect might cause an infinite loop here.
  useEffect(() => {
    
    getData()
    return () => {
      // Abort if there
      if (controllerRef.current) {
        controllerRef.current.abort()
      }
    }
  }, [fetchFunction])

  return { data, loading, error, refetch: getData, setData}
}

export default useFetchData