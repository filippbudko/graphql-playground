import * as React from 'react'

export default function Spinner() {
  return (
    <div className="spinner-container">
      <style jsx={true}>{`
        .spinner-container {
          height: 36px;
          left: 50%;
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 36px;
          z-index: 10;
        }

        @keyframes rotation {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(359deg);
          }
        }

        .spinner {
          animation: rotation 0.6s infinite linear;
          border-bottom: 6px solid rgba(150, 150, 150, .15);
          border-left: 6px solid rgba(150, 150, 150, .15);
          border-radius: 100%;
          border-right: 6px solid rgba(150, 150, 150, .15);
          border-top: 6px solid rgba(150, 150, 150, .8);
          display: inline-block;
          height: 24px;
          width: 24px;
          position: absolute;
          vertical-align: middle;
        }
      `}</style>
      <div className="spinner" />
    </div>
  )
}
