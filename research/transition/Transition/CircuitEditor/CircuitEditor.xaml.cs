using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Collections.Specialized;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor.OnScreenComponents;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Easycoustics.Transition.Commands;
using Easycoustics.Transition.Common;
using Easycoustics.Transition.Design;
using Easycoustics.Transition.Functions;
using Windows.ApplicationModel.DataTransfer;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.System;
using Windows.UI;
using Windows.UI.Core;
using Windows.UI.Input;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;
using Windows.UI.Xaml.Shapes;
using static Easycoustics.Transition.App;

// The User Control item template is documented at https://go.microsoft.com/fwlink/?LinkId=234236

namespace Easycoustics.Transition.CircuitEditor
{
    public sealed partial class CircuitEditor : UserControl
    {
        public static CircuitEditor currentInstance;
        public static UserDesign CurrentDesign => UserDesign.CurrentDesign;

        //  public UserDesign CurrentDesign { get; set; }

        public ObservableCollection<ICircuitSelectable> selectedElements = new ObservableCollection<ICircuitSelectable>();
        public List<Line> gridLines;

        private bool SnapToGrid { get {
                if (Window.Current.CoreWindow.GetKeyState(VirtualKey.Control).HasFlag(CoreVirtualKeyStates.Down))
                    return !CurrentDesign.SnapToGrid;
                else
                    return CurrentDesign.SnapToGrid; } }

        public bool groupSelect = false;
        private bool movingComponents = false;
        public Point pointStartGroupSelect;
        public Rectangle rectGroupSelect = new Rectangle()
        {
            StrokeThickness = 1,
            Stroke = new SolidColorBrush(Colors.Black),
            Width = 1,
            Height = 1
        };

        public Point2D clickedPoint;

        public Grid grdNoSelectedElement;
        public Grid grdWiresHaveNoParameters;

        public ObservableStack<ICircuitCommand> UndoStack = new ObservableStack<ICircuitCommand>() { MaximumElements = 25 };
        public ObservableStack<ICircuitCommand> RedoStack = new ObservableStack<ICircuitCommand>() { MaximumElements = 25 };

     
        public CircuitEditor()
        {
            InitializeComponent();

            init();
            selectedElements.CollectionChanged += refreshSelectedElements;

            gridLines = new List<Line>();

            CircuitEditor.currentInstance = this;   //XAML constructed singleton?

            UndoStack.StackChanged += HandleUndoStack;
            RedoStack.StackChanged += HandleRedoStack;

        }

        private void HandleUndoStack(object sender, NotifyCollectionChangedEventArgs e)
        {
            btnUndo.IsEnabled = !UndoStack.IsEmpty;
        }

        private void HandleRedoStack(object sender, NotifyCollectionChangedEventArgs e)
        {
            btnRedo.IsEnabled = !RedoStack.IsEmpty;
        }

        private void init()
        {
            grdNoSelectedElement = new Grid();
            grdNoSelectedElement.Children.Add(new TextBlock()
            {
                Text = "No selected element...",
                FontStyle = Windows.UI.Text.FontStyle.Italic,
                Margin = new Thickness(4)
            });

            grdWiresHaveNoParameters = new Grid();
            grdWiresHaveNoParameters.Children.Add(new TextBlock()
            {
                Text = "Wires have no parameters...",
                FontStyle = Windows.UI.Text.FontStyle.Italic,
                Margin = new Thickness(4)
            });


            rectGroupSelect.PointerReleased += cnvPointerReleased;
        }

        public void loadDesign(UserDesign design)
        {
            // CurrentDesign = design;

            design.CanvasCircuit.PointerPressed += cnvPointerPressed;
            design.CanvasCircuit.PointerMoved += cnvPointerMoved;
            design.CanvasCircuit.PointerReleased += cnvPointerReleased;
            design.CanvasCircuit.Drop += drop;
            design.CanvasCircuit.DragOver += dragOver;

            cnvGeneral.Children.Add(design.CanvasCircuit);

        }

        public void updateDesign(object sender, NotifyCollectionChangedEventArgs e)
        {

        }

        private void clickDeleteComponent(object sender, RoutedEventArgs e)
        {
            foreach (ScreenComponentBase element in selectedElements.OfType<ScreenComponentBase>())
                executeCommand(new CommandRemoveComponent(element.SerializableComponent));

            foreach (WireTerminal wt in selectedElements.OfType<WireTerminal>())
                executeCommand(new CommandRemoveWire()
                { Wire = wt.WireScreen.serializableWire });
        }

        public void refreshSelectedElements(object sender, NotifyCollectionChangedEventArgs e)
        {
            switch (e.Action)
            {
                case NotifyCollectionChangedAction.Add:
                    foreach (ICircuitSelectable element in e.NewItems)
                    {
                        element.selected();

                        if (element is ScreenComponentBase)
                        {
                            var component = (ScreenComponentBase)element;

                            scrComponentParameters.Content = component.SerializableComponent.ParametersControl;
                            tglbtnCommonControlFlipX.IsChecked = component.FlipX;
                            tglbtnCommonControlFlipY.IsChecked = component.FlipY;
                            txtHeaderComponentParameters.Text = component.SerializableComponent.ElementType + " Parameters";

                        }
                        if (element is WireTerminal)
                        { scrComponentParameters.Content = grdWiresHaveNoParameters;
                            txtHeaderComponentParameters.Text = "Wire Terminal";
                        }
                    }
                    enableComponentEdit();
                    break;

                case NotifyCollectionChangedAction.Remove:
                    foreach (ICircuitSelectable element in e.OldItems)
                        element.deselected();

                    disableComponentEdit();
                    break;

                case NotifyCollectionChangedAction.Reset:
                    {
                        foreach (ICircuitSelectable element in CurrentDesign.getAllSelectable())
                            element.deselected();
                    }
                    disableComponentEdit();
                    break;
            }
        }


        private void enableComponentEdit()
        {
            tglbtnCommonControlFlipX.IsEnabled = true;
            tglbtnCommonControlFlipY.IsEnabled = true;
            btnCommonControlRotate.IsEnabled = true;
            btnDeleteComponent.IsEnabled = true;
        }

        private void disableComponentEdit()
        {
            tglbtnCommonControlFlipX.IsEnabled = false;
            tglbtnCommonControlFlipY.IsEnabled = false;
            btnCommonControlRotate.IsEnabled = false;
            btnDeleteComponent.IsEnabled = false;

            scrComponentParameters.Content = grdNoSelectedElement;
            txtHeaderComponentParameters.Text = "Nothing selected...";
        }

        public void selectElement(ICircuitSelectable element)
        {
            selectedElements.Clear();
            selectedElements.Add(element);

        }

        public void addElement(string element)
        {
            //tap event invoques an element on center of drawboard
            addElement(element, new Point2D(
                snapCoordinate(cnvGeneral.Width / 2),
                snapCoordinate(cnvGeneral.Height / 2)));
        }

        public void addElement(string stringComponent, Point2D ptCanvas)
        {
            ICircuitCommand command;

            if (stringComponent != "wire")
            {
                var component = createElement(stringComponent);
                component.ComponentPosition = snapCoordinate(ptCanvas);
                component.ElementName = component.ElementLetter + CurrentDesign.getNextNumberLetter(component.ElementLetter).ToString();

                command = new CommandAddComponent() { Component = component };
            }
            else
            {
                Point2D ptCanvas2 = new Point2D(ptCanvas.X + 100, ptCanvas.Y);

                var wire = new SerializableWire()
                {
                    PositionTerminal0 = snapCoordinate(ptCanvas),
                    PositionTerminal1 = snapCoordinate(ptCanvas2),
                    ElementName = "W" + (CurrentDesign.getMaximumNumberWire() + 1).ToString()
                };

                command = new CommandAddWire() { Wire = wire };
            }

            executeCommand(command);
        }

        private void bindComponentTerminalPair(ElementTerminal et1, ElementTerminal et2)
        {

            SerializableWire wire = CurrentDesign.bindComponentTerminal(
                ((ScreenComponentBase)et1.ScreenElement).SerializableComponent, et1.TerminalNumber,
                ((ScreenComponentBase)et2.ScreenElement).SerializableComponent, et2.TerminalNumber);

            if (wire == null) return;
        }

        private void clickRotate(object sender, RoutedEventArgs e)
        {
            foreach (ScreenComponentBase comp in selectedElements.OfType<ScreenComponentBase>())
            {
                var command = new CommandRotateComponent()
                {
                    Component = comp.SerializableComponent,
                    oldValue = comp.ActualRotation,
                    newValue = comp.ActualRotation + 90
                };
                executeCommand(command);
            }
        }

        private void clickFlipX(object sender, RoutedEventArgs e)
        {
            foreach (ScreenComponentBase comp in selectedElements.OfType<ScreenComponentBase>())
                comp.SerializableComponent.FlipX ^= true;
        }

        private void clickFlipY(object sender, RoutedEventArgs e)
        {
            foreach (ScreenComponentBase comp in selectedElements.OfType<ScreenComponentBase>())
                comp.SerializableComponent.FlipY ^= true;
        }

        private void tapCloseButton(object sender, TappedRoutedEventArgs e)
        {
            splitter.IsPaneOpen = false;
        }

        private async void drop(object sender, DragEventArgs e)
        {
            string element = await e.DataView.GetTextAsync();
            Point p = e.GetPosition(cnvGeneral);

            Point2D ptCanvas = new Point2D(p.X, p.Y);

            addElement(element, ptCanvas);
        }

        private void dragOver(object sender, DragEventArgs e)
        {
            e.AcceptedOperation = DataPackageOperation.Move;
        }

        private void reDrawCanvas(object sender, SizeChangedEventArgs e)
        {

            double width = cnvGeneral.ActualWidth;
            double height = cnvGeneral.ActualHeight;

            int x = 0;
            int y = 0;

            foreach (Line l in gridLines)
                if (cnvGeneral.Children.Contains(l))
                    cnvGeneral.Children.Remove(l);

            gridLines.Clear();

            Line line;
            double strokeThickness = 1;
            Brush strokeColor = new SolidColorBrush(Colors.LightGray);

            while (x < width)
            {
                x += 20;
                line = new Line()
                {
                    X1 = x,
                    X2 = x,
                    Y1 = 0,
                    Y2 = height,
                    Stroke = strokeColor,
                    StrokeThickness = strokeThickness
                };
                gridLines.Add(line);
            }

            while (y < height)
            {
                y += 20;
                line = new Line()
                {
                    X1 = 0,
                    X2 = width,
                    Y1 = y,
                    Y2 = y,
                    Stroke = strokeColor,
                    StrokeThickness = strokeThickness
                };
                gridLines.Add(line);
            }

            foreach (Line l in gridLines)
            {
                cnvGeneral.Children.Add(l);
                Canvas.SetZIndex(l, -1);
            }
        }

        private double snapCoordinate(double coordinate)
        {
            return SnapToGrid ? Statics.round20(coordinate) : coordinate;
        }

        private Point2D snapCoordinate(Point2D coordinate)
        {
            return new Point2D(
                SnapToGrid ? Statics.round20(coordinate.X) : coordinate.X,
                SnapToGrid ? Statics.round20(coordinate.Y) : coordinate.Y);
        }


        private void cnvPointerPressed(object sender, PointerRoutedEventArgs e)
        {
            clickedPoint = new Point2D(e.GetCurrentPoint(cnvGeneral).Position.X,
                                       e.GetCurrentPoint(cnvGeneral).Position.Y);

            var clickedElement = CurrentDesign.getClickedElement(clickedPoint);

            if (e.GetCurrentPoint(cnvGeneral).Properties.IsLeftButtonPressed)

                if (clickedElement == null)
                {
                    if (rectGroupSelect != null)
                        if (cnvGeneral.Children.Contains(rectGroupSelect))
                            cnvGeneral.Children.Remove(rectGroupSelect);

                    groupSelect = true;
                    pointStartGroupSelect = e.GetCurrentPoint(cnvGeneral).Position;
                    selectedElements.Clear();
                    rectGroupSelect.Width = 0;
                    rectGroupSelect.Height = 0;
                    cnvGeneral.Children.Add(rectGroupSelect);
                }
                else
                {
                    movingComponents = true;
                    /* we can select a component, wire terminal or wire
                     if the user selects a wire, only a both terminals free wire can be selected*/
                    if (!selectedElements.Contains(clickedElement))
                    {
                        if (clickedElement is WireScreen)
                        {
                            if (((WireScreen)clickedElement).AreBothTerminalsFree)
                                selectElement(clickedElement);
                        }
                        else { selectElement(clickedElement); }
                    }

                    if (clickedElement is WireTerminal)
                        ((WireTerminal)clickedElement).selected();
                }

            if (e.GetCurrentPoint(cnvGeneral).Properties.IsRightButtonPressed)
                if (clickedElement != null)
                {
                    selectElement(clickedElement);
                    splitter.IsPaneOpen = true;
                }
        }

        private void cnvPointerMoved(object sender, PointerRoutedEventArgs e)
        {
            if (e.GetCurrentPoint(cnvGeneral).Properties.IsLeftButtonPressed)
            {
                Point2D ptCanvas = new Point2D(e.GetCurrentPoint(cnvGeneral).Position.X,
                                               e.GetCurrentPoint(cnvGeneral).Position.Y);

                if (groupSelect)
                {
                    /* user is making a group select */
                    double left;
                    double top;
                    double width;
                    double height;

                    left = (pointStartGroupSelect.X < ptCanvas.X) ? pointStartGroupSelect.X : ptCanvas.X;
                    top = (pointStartGroupSelect.Y < ptCanvas.Y) ? pointStartGroupSelect.Y : ptCanvas.Y;

                    width = ((pointStartGroupSelect.X - ptCanvas.X) > 0) ?
                             (pointStartGroupSelect.X - ptCanvas.X) :
                             (ptCanvas.X - pointStartGroupSelect.X);

                    height = ((pointStartGroupSelect.Y - ptCanvas.Y) > 0) ?
                             (pointStartGroupSelect.Y - ptCanvas.Y) :
                             (ptCanvas.Y - pointStartGroupSelect.Y);

                    Canvas.SetLeft(rectGroupSelect, left);
                    Canvas.SetTop(rectGroupSelect, top);
                    rectGroupSelect.Width = width;
                    rectGroupSelect.Height = height;

                    return;
                }
                else
                if (movingComponents)
                {
                    if (selectedElements.Count > 1)
                    {
                        foreach (ICircuitMovable element in selectedElements.OfType<ICircuitMovable>())
                            element.moveRelative(snapCoordinate(ptCanvas - clickedPoint));
                    }

                    if (selectedElements.Count == 1)
                    {
                        if (selectedElements[0] is WireTerminal)
                        {
                            /* user is moving a wire terminal that can be bounded or free,
                             * at button release, a bind or unbind command can be fired */
                            WireTerminal wt = (WireTerminal)selectedElements[0];

                            var nearest = CurrentDesign.getNearestElementTerminalExcept(ptCanvas, wt.ScreenElement);
                            CurrentDesign.lowlightAllTerminalsAllElements();
                            wt.highlight();
                            if (nearest != null)
                            {
                                /* there is a terminal of something (component or other wire) nearby
                                   so the dragged wire terminal "snaps" to the nearby terminal*/
                                nearest.highlight();
                                wt.moveAbsolute(nearest.getAbsoluteTerminalPosition());
                            }
                            else
                            {   //there is nothing nearby so we can move the  wire terminal, freely
                                wt.moveRelative(snapCoordinate(ptCanvas - clickedPoint));
                            }

                        }
                        else
                        if (selectedElements[0] is ScreenComponentBase)
                        {   /* here, the one selected element is a component.
                            while dragging, if one its terminals is very close to 
                            some other terminal of other component,
                            the two terminals will be highlighted.
                            */
                            var component = selectedElements[0] as ScreenComponentBase;
                            component.moveRelative(snapCoordinate(ptCanvas - clickedPoint));

                            CurrentDesign.lowlightAllTerminalsAllElements();
                            var pairs = CurrentDesign.getListPairedComponentTerminals(component);

                            foreach (KeyValuePair<byte, ElementTerminal> pair in pairs)
                            {
                                component.highlightTerminal(pair.Key);
                                pair.Value.highlight();
                            };
                        }
                        else
                        if (selectedElements[0] is WireScreen)
                        {
                            WireScreen ws = (WireScreen)selectedElements[0];
                            ws.moveRelative(snapCoordinate(ptCanvas - clickedPoint));
                        }
                    }
                }
            }
        }

        private void cnvPointerReleased(object sender, PointerRoutedEventArgs e)
        {
            /* this method is messy 
             when the user releases the mouse button, commands of moving or binding
             must be packed up and execute, so the pile up in the undo stack */

            Point2D ptCanvas = new Point2D(e.GetCurrentPoint(cnvGeneral).Position.X,
                                           e.GetCurrentPoint(cnvGeneral).Position.Y);

            if (groupSelect)
            {
                if (rectGroupSelect != null) cnvGeneral.Children.Remove(rectGroupSelect);
                groupSelect = false;

                selectedElements.Clear();

                /* thanks to MS folks, ObservableCollection does not support the
                 AddRange method, and I do not want to implement one myself */
                foreach (ICircuitSelectable item in CurrentDesign.enclosingElementsForGroupSelect(rectGroupSelect))
                    selectedElements.Add(item);
            }


            if (movingComponents) //things are being moved, and the user released them
                if (selectedElements.Count == 1)
                {
                    var selectedElement = selectedElements[0];

                    if (selectedElement is WireTerminal)
                    {  //one thing is being moved, and it is a Wire Terminal
                        WireTerminal wt = (WireTerminal)selectedElement;
                        ElementTerminal nearest = CurrentDesign.getNearestElementTerminalExcept(ptCanvas, wt.ScreenElement);

                        if (!wt.isBounded)
                        {   /*the wt is free */
                            if (nearest != null) /* if there is some terminal nearby, we bind the wire to it*/
                            {
                                var command = new CommandBindWire()
                                {
                                    BoundedObject = nearest.ScreenElement.Serializable,
                                    BoundedTerminal = nearest.TerminalNumber,
                                    PreviousStateBounded = false,
                                    PreviousTerminalPosition = wt.OriginalTerminalPosition,
                                    Wire = wt.WireScreen.serializableWire,
                                    WireTerminalNumber = wt.TerminalNumber
                                };
                                executeCommand(command);
                            }
                            else
                            { /* the dragged wire terminal is just moved without bind it to something */
                                if (wt.OriginalTerminalPosition != wt.TerminalPosition)
                                {
                                    var command = new CommandMoveWireTerminal()
                                    {
                                        OldPosition = wt.OriginalTerminalPosition,
                                        NewPosition = snapCoordinate(ptCanvas),
                                        WireTerminalNumber = wt.TerminalNumber,
                                        Wire = wt.WireScreen.serializableWire
                                    };
                                    executeCommand(command);
                                }
                            }
                        }
                        else
                        {
                            /* user had been moving a bounded wire terminal */
                            if (nearest != null)
                            {
                                if ((nearest.ScreenElement == wt.WireScreen.bind(wt.TerminalNumber).Item1) &&
                                    (nearest.TerminalNumber == wt.WireScreen.bind(wt.TerminalNumber).Item2))
                                {
                                    /* here the user did release the wire terminal at the same place it picked off
                                     so we do not alter the binding of the wire terminal */
                                }
                                else
                                {
                                    var command = new CommandBindWire()
                                    {
                                        BoundedObject = nearest.ScreenElement.Serializable,
                                        BoundedTerminal = nearest.TerminalNumber,
                                        PreviousStateBounded = true,
                                        PreviousBoundedObject = wt.WireScreen.serializableWire.bnd(wt.TerminalNumber).Item1,
                                        PreviuosBoundedTerminal = wt.WireScreen.serializableWire.bnd(wt.TerminalNumber).Item2,
                                        Wire = wt.WireScreen.serializableWire,
                                        WireTerminalNumber = wt.TerminalNumber
                                    };
                                    executeCommand(command);
                                }
                            }
                            else
                            { /* here the user dropped off the bounded wire terminal
                                some where far from a terminal, so we understand the user
                                wants to free and unbind the terminal */
                                var command = new CommandUnBindWire()
                                {
                                    Wire = wt.WireScreen.serializableWire,
                                    WireTerminalNumber = wt.TerminalNumber,
                                    BoundedObject = wt.WireScreen.serializableWire.bnd(wt.TerminalNumber).Item1,
                                    ObjectTerminalNumber = wt.WireScreen.serializableWire.bnd(wt.TerminalNumber).Item2,
                                    newPosition = snapCoordinate(ptCanvas)
                                };
                                executeCommand(command);
                            }
                        }
                    }
                    else
                    if (selectedElement is ScreenComponentBase)
                    { /* the moved element is a component */
                        var component = selectedElements[0] as ScreenComponentBase;

                        if ((component.ComponentPosition != component.OriginalComponentPosition))
                        {   /* we check the component has actually moved and not stayed in place */
                            /* we do a move command */
                            var command = new CommandMoveComponent()
                            {
                                OldPosition = component.SerializableComponent.ComponentPosition,
                                NewPosition = component.ComponentPosition,
                                Component = component.SerializableComponent
                            };
                            executeCommand(command);

                            /* and now we do a bind command, in case the component has moved
                               close enough to other terminals */
                            var binds = CurrentDesign.getListPairedComponentTerminals(component);
                            if (binds.Count > 0)
                            {
                                var command2 = new CommandBindComponent(binds, component.SerializableComponent);
                                executeCommand(command2);
                            }
                        }
                    }
                    else
                    if (selectedElement is WireScreen)
                    {
                        WireScreen ws = selectedElement as WireScreen;

                        var command = new CommandMoveFreeWire()
                        {
                            OldPositionTerminal0 = ws.getWireTerminal(0).OriginalTerminalPosition,
                            OldPositionTerminal1 = ws.getWireTerminal(1).OriginalTerminalPosition,
                            NewPositionTerminal0 = ws.getWireTerminal(0).TerminalPosition,
                            NewPositionTerminal1 = ws.getWireTerminal(1).TerminalPosition,
                            Wire = ws.serializableWire
                        };
                        executeCommand(command);
                    }

                }
                else
                if (selectedElements.Count > 1)
                {
                    var command = new CommandMoveGroup();
                    command.Elements.AddRange(selectedElements.OfType<ICircuitMovable>());
                    command.DistanceVector = snapCoordinate(ptCanvas - clickedPoint);

                    executeCommand(command);

                }

            movingComponents = false;

        }

        public void showParameters(ScreenComponentBase component)
        {
            //  scrComponentParameters.Content = element.parameters;
            splitter.IsPaneOpen = true;
            selectElement(component);
        }


        public static SerializableComponent createElement(string element)
        {
            switch (element)
            {
                case "resistor": return new Resistor();
                case "capacitor": return new Capacitor();
                case "inductor": return new Inductor();
                case "fdnr": return new FDNR();
                case "ground": return new Ground();
                case "potentiometer": return new Potentiometer();
                case "transformer": return new Transformer();
                case "generator": return new VoltageSource();
                case "opamp": return new OpAmp();
                case "switch": return new Switch();
                case "impedance": return new Impedance();
                case "scn": return new SCN();
                case "transferfunction": return new TransferFunctionComponent();
                case "summer": return new Summer();
                case "buffer": return new Serializable.Buffer();
                case "transducer": return new Transducer();
                case "voltagenode": return new VoltageOutputNode();
                case "voltagediff": return new VoltageOutputDifferential();
            }

            throw new NotSupportedException();
        }


        private void dragElement(UIElement sender, DragStartingEventArgs args)
        {

            Border b = (Border)sender;
            var element = (string)b.Tag;

            args.DragUI.SetContentFromDataPackage();
            args.Data.RequestedOperation = DataPackageOperation.Move;
            args.Data.SetText(element);
        }

        private void tapElement(object sender, TappedRoutedEventArgs e)
        {

            var bd = (Border)sender;
            var element = (string)bd.Tag;

            addElement(element);
        }

        public void executeCommand(ICircuitCommand command)
        {
            RedoStack.Clear();

            Analyzer.CurrentInstance.dispatchCommand(command.execute, command);
            /*
            command.execute();

            switch (command.CommandType)
            {
                case CommandType.DontCalculate: break;
                case CommandType.ReBuild: BuildAndCalculate(); break;
                case CommandType.ReCalculate: Calculate(); break;
            }
            */

            UndoStack.Push(command);
        }

        public void undo()
        {
            if (UndoStack.Count == 0) return;

            var command = UndoStack.Pop();

            Analyzer.CurrentInstance.dispatchCommand(command.unExecute, command);
            /*command.unExecute();
            
            switch (command.CommandType)
            {
                case CommandType.DontCalculate: break;
                case CommandType.ReBuild: BuildAndCalculate(); break;
                case CommandType.ReCalculate: Calculate(); break;
            }*/
            
            RedoStack.Push(command);
        }

        public void redo()
        {
            if (RedoStack.Count == 0) return;

            var command = RedoStack.Pop();

            Analyzer.CurrentInstance.dispatchCommand(command.execute, command);
            /*command.execute();
            
            switch (command.CommandType)
            {
                case CommandType.DontCalculate: break;
                case CommandType.ReBuild: BuildAndCalculate(); break;
                case CommandType.ReCalculate: Calculate(); break;
            }*/
            
            UndoStack.Push(command);
        }


        private void tapUndo(object sender, TappedRoutedEventArgs e)
        {
            undo();
        }

        private void tapRedo(object sender, TappedRoutedEventArgs e)
        {
            redo();
        }

        private void tapFlipX(object sender, TappedRoutedEventArgs e)
        {
            foreach (ScreenComponentBase comp in selectedElements.OfType<ScreenComponentBase>())
            {
                var command = new CommandFlipComponent()
                {
                    Component = comp.SerializableComponent,
                    IsFlipY = false,
                    NewValue = !comp.FlipX
                };

                executeCommand(command);
            }
        }

        private void tapFlipY(object sender, TappedRoutedEventArgs e)
        {
            foreach (ScreenComponentBase comp in selectedElements.OfType<ScreenComponentBase>())
            {
                var command = new CommandFlipComponent()
                {
                    Component = comp.SerializableComponent,
                    IsFlipY = true,
                    NewValue = !comp.FlipY
                };

                executeCommand(command);
            }
        }

        private void TapCalculate(object sender, TappedRoutedEventArgs e)
        {
          //  Calculate();

        }

        /*
        private void BuildAndCalculate()
        {
            txtStatus.Text = "Building Circuit...";
            var buildResult = Analyzer.CurrentInstance.Build();

            txtStatus.Text = buildResult.Item2;

            if (buildResult.Item1 == false)
                return;

            Calculate();
        }

        private void Calculate()
        {
            txtStatus.Text = "Solving Circuit...";
            Analyzer.CurrentInstance.Calculate();
            
        }
        */

        public void SetStatusText(string statusText)
        {
            txtStatus.Text = statusText;
        }

    }
}
