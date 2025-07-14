const Index = () => {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#ffffff', 
      color: '#000000',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>
        DrBubbles Test
      </h1>
      <p style={{ fontSize: '24px' }}>
        If you can see this, the page is working.
      </p>
      <div style={{ 
        backgroundColor: '#007acc', 
        color: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        marginTop: '20px'
      }}>
        This is a blue box to test colors.
      </div>
    </div>
  );
};

export default Index;
