
// import dynamic from 'next/dynamic';

// const Stories = dynamic(() => import('@/components/StoryMap/StoriesManager'), {
//   ssr: false,
//   loading: () => <p>Loading editor...</p>,
// });

// export default function HomePage() {
//   return (
//     <div>
//       <Stories />
//     </div>
//   );
// }

// 'use client';
// import dynamic from 'next/dynamic';

// const CesiumViewer = dynamic(() => import('@/components/test/CesiumViewer'), {
//   ssr: false,
//   loading: () => (
//     <div
//       style={{
//         width: '100%',
//         height: '100vh',
//         display: 'flex',
//         alignItems: 'center',
//         justifyContent: 'center',
//         background: '#0a0a0a',
//         color: 'white',
//       }}
//     >
//       Loading 3D Globe...
//     </div>
//   ),
// });

// export default function Home() {
//   return <CesiumViewer />;
// }

// 'use client';

// import dynamic from 'next/dynamic';

// const DeckGLViewer = dynamic(() => import('@/components/test/DeckglViewer'), {
//   ssr: false,
//   loading: () => (
//     <div
//       style={{
//         width: '100%',
//         height: '100vh',
//         display: 'flex',
//         alignItems: 'center',
//         justifyContent: 'center',
//         background: '#1a1a2e',
//         color: 'white',
//       }}
//     >
//       Loading deck.gl viewer...
//     </div>
//   ),
// });

// export default function DeckGLPage() {
//   return <DeckGLViewer />;
// }

