export default function Wave() {
    return (
        <div>
            <svg
            className="waves"
            viewBox="0 24 150 28"
            preserveAspectRatio="none"
            shape-rendering="auto"
            >
            <defs>
                <path
                id="gentle-wave"
                d="M-160 42c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z"
                />
                <filter id="wave-shadow" x="-50%" y="-50%" width="190%" height="190%">
                    <feDropShadow dx="0" dy="2" stdDeviation="8" flood-color="black" flood-opacity="0.9" />
                </filter>
            </defs>
            <g className="parallax" >
                <use href="#gentle-wave" x="48" y="0" fill="#20294A" filter="url(#wave-shadow)"/>
                <use href="#gentle-wave" x="48" y="3" fill="#2B385B" filter="url(#wave-shadow)"/>
                <use href="#gentle-wave" x="48" y="5" fill="#525D7D" filter="url(#wave-shadow)"/>
                <use href="#gentle-wave" x="48" y="7" fill="#979DAD" filter="url(#wave-shadow)"/>
            </g>
            </svg>

        </div>
    )
}