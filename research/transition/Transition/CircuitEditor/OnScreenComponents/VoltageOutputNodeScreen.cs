using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Easycoustics.Transition.Common;
using Windows.UI;
using Windows.UI.Text;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Shapes;

namespace Easycoustics.Transition.CircuitEditor.OnScreenComponents
{
    public class VoltageOutputNodeScreen : ScreenComponentBase
    {
        public override int[,] TerminalPositions
        {
            get => new int[,] { { 40, 40 } };
        }

        public override double SchematicWidth => 80;
        public override double SchematicHeight => 80;

        private VoltageOutputNode Node;

        public TextBlock txtComponentName;
        public TextBlock txtDescription;

        public override void setPositionTextBoxes(SerializableElement element)
        {
           
        }

        public VoltageOutputNodeScreen(VoltageOutputNode node) : base(node)
        {
            Node = node;

            txtComponentName = new TextBlock() { FontWeight = FontWeights.ExtraBold };
            Binding b1 = new Binding()
            {
                Path = new PropertyPath("ElementName"),
                Mode = BindingMode.OneWay,
                Source = Node
            };
            txtComponentName.SetBinding(TextBlock.TextProperty, b1);
            txtComponentName.RenderTransform = new TranslateTransform() { };
            txtComponentName.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };

            ((TranslateTransform)txtComponentName.RenderTransform).X = 20;
            ((TranslateTransform)txtComponentName.RenderTransform).Y = 0;

            Children.Add(txtComponentName);



            txtDescription = new TextBlock() { FontWeight = FontWeights.ExtraBold };
            Binding b2 = new Binding()
            {
                Path = new PropertyPath("Description"),
                Mode = BindingMode.OneWay,
                Source = Node
            };
            txtDescription.SetBinding(TextBlock.TextProperty, b2);
            txtDescription.RenderTransform = new TranslateTransform() { };
            txtDescription.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };

            ((TranslateTransform)txtDescription.RenderTransform).X = 20;
            ((TranslateTransform)txtDescription.RenderTransform).Y = 20;

            Children.Add(txtDescription);



            var rect = new Rectangle()
            {
                Width = 10,
                Height = 10,
                Fill = new SolidColorBrush(Colors.Black)
            };
            //rect.RenderTransform = new TranslateTransform() { X = 15, Y = 15 };
            Children.Add(rect);
            postConstruct();
        }
    }
}
