import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSensors } from '../context/SensorContext.jsx'
import SchematicMap from '../components/SchematicMap.jsx'

export default function MapPage() {
  const { areas, shelters, publicPoints, mapImage } = useSensors()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const focusAreaId = searchParams.get('area')

  return (
    <div className="page">
      <p style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 16 }}>
        Pontos de atenção, localização e abrigos.
      </p>
      <SchematicMap
        areas={areas}
        shelters={shelters}
        points={publicPoints}
        image={mapImage}
        focusAreaId={focusAreaId}
        onSelectArea={(id) => navigate(`/areas/${id}`)}
      />
    </div>
  )
}
