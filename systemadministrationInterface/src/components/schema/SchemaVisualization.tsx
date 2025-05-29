import React, { useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Node, Edge, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
const initialNodes: Node[] = [{
  id: 'products',
  type: 'default',
  data: {
    label: <div>
          <strong>products</strong>
          <div className="text-xs mt-1">
            <div>id: INT (PK)</div>
            <div>name: VARCHAR</div>
            <div>price: DECIMAL</div>
            <div>category_id: INT (FK)</div>
          </div>
        </div>
  },
  position: {
    x: 250,
    y: 50
  },
  className: 'bg-white dark:bg-gray-800 border-2 border-blue-500 p-2 rounded-lg shadow-md'
}, {
  id: 'categories',
  type: 'default',
  data: {
    label: <div>
          <strong>categories</strong>
          <div className="text-xs mt-1">
            <div>id: INT (PK)</div>
            <div>name: VARCHAR</div>
            <div>description: TEXT</div>
          </div>
        </div>
  },
  position: {
    x: 50,
    y: 150
  },
  className: 'bg-white dark:bg-gray-800 border-2 border-blue-500 p-2 rounded-lg shadow-md'
}, {
  id: 'orders',
  type: 'default',
  data: {
    label: <div>
          <strong>orders</strong>
          <div className="text-xs mt-1">
            <div>id: INT (PK)</div>
            <div>customer_id: INT (FK)</div>
            <div>date: DATETIME</div>
            <div>status: VARCHAR</div>
          </div>
        </div>
  },
  position: {
    x: 450,
    y: 150
  },
  className: 'bg-white dark:bg-gray-800 border-2 border-blue-500 p-2 rounded-lg shadow-md'
}, {
  id: 'customers',
  type: 'default',
  data: {
    label: <div>
          <strong>customers</strong>
          <div className="text-xs mt-1">
            <div>id: INT (PK)</div>
            <div>name: VARCHAR</div>
            <div>email: VARCHAR</div>
            <div>phone: VARCHAR</div>
          </div>
        </div>
  },
  position: {
    x: 650,
    y: 50
  },
  className: 'bg-white dark:bg-gray-800 border-2 border-blue-500 p-2 rounded-lg shadow-md'
}, {
  id: 'order_items',
  type: 'default',
  data: {
    label: <div>
          <strong>order_items</strong>
          <div className="text-xs mt-1">
            <div>id: INT (PK)</div>
            <div>order_id: INT (FK)</div>
            <div>product_id: INT (FK)</div>
            <div>quantity: INT</div>
            <div>price: DECIMAL</div>
          </div>
        </div>
  },
  position: {
    x: 350,
    y: 300
  },
  className: 'bg-white dark:bg-gray-800 border-2 border-blue-500 p-2 rounded-lg shadow-md'
}];
const initialEdges: Edge[] = [{
  id: 'e1-2',
  source: 'products',
  target: 'categories',
  animated: true,
  label: '1:N',
  style: {
    stroke: '#2563eb'
  }
}, {
  id: 'e3-4',
  source: 'orders',
  target: 'customers',
  animated: true,
  label: 'N:1',
  style: {
    stroke: '#2563eb'
  }
}, {
  id: 'e3-5',
  source: 'order_items',
  target: 'orders',
  animated: true,
  label: 'N:1',
  style: {
    stroke: '#2563eb'
  }
}, {
  id: 'e1-5',
  source: 'order_items',
  target: 'products',
  animated: true,
  label: 'N:1',
  style: {
    stroke: '#2563eb'
  }
}];
const SchemaVisualization: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const onConnect = useCallback((params: any) => {
    setEdges(eds => addEdge(params, eds));
  }, [setEdges]);
  return <div className="h-full">
      <div className="bg-white dark:bg-gray-800 p-4 mb-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-2">Database Schema</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Interactive visualization of the EmpowerPOS database schema showing
          table relationships.
        </p>
      </div>
      <div className="h-[calc(100%-100px)] border rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800">
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} fitView>
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>;
};
export default SchemaVisualization;