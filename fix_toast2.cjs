const fs = require('fs');
let s = fs.readFileSync('src/pages/customer/CustomerPortal.tsx', 'utf8');

const toast = `
      {/* Success Notification */}
      <AnimatePresence>
        {orderSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-6 left-1/2 z-[100] bg-brand-blue text-white px-6 py-4 rounded-2xl shadow-2xl font-medium w-[90%] max-w-sm text-center border border-white/20 backdrop-blur-md"
          >
            {orderSuccess}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
`;

// Replace the very end of the file safely
const idx = s.lastIndexOf('</main>');
if (idx !== -1) {
  const endPart = s.slice(idx);
  const newEnd = endPart.replace(/<\/div>[\s\S]*\}\s*$/, toast.trim() + '\n');
  s = s.slice(0, idx) + newEnd;
  fs.writeFileSync('src/pages/customer/CustomerPortal.tsx', s);
}
